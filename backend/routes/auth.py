from datetime import UTC, datetime, timedelta
from typing import Annotated
import uuid

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_session
from middleware.rate_limit import limiter
from models import Host, RefreshToken
from schemas import HostCreate, HostResponse, LoginRequest, TokenResponse
from services.auth import (
    create_access_token,
    create_refresh_token,
    get_current_host,
    hash_password,
    hash_token,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["auth"])


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="memoire_refresh",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain if settings.cookie_domain != "localhost" else None,
        samesite="lax",
        max_age=settings.jwt_refresh_expire_days * 24 * 60 * 60,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="memoire_refresh",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain if settings.cookie_domain != "localhost" else None,
        samesite="lax",
    )


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/minute")
async def register(
    request: Request,
    payload: HostCreate,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    existing = await session.execute(select(Host.id).where(Host.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    host = Host(
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
    )
    session.add(host)
    await session.commit()
    await session.refresh(host)

    access_token = create_access_token(host.id, host.email)
    raw_refresh, jti = create_refresh_token(host.id)

    db_refresh = RefreshToken(
        host_id=host.id,
        token_hash=hash_token(raw_refresh),
        expires_at=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_expire_days),
    )
    session.add(db_refresh)
    await session.commit()

    set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        host=HostResponse.model_validate(host),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    result = await session.execute(select(Host).where(Host.email == payload.email))
    host = result.scalar_one_or_none()

    if not host or not verify_password(payload.password, host.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    host.last_login_at = datetime.now(UTC)
    
    access_token = create_access_token(host.id, host.email)
    raw_refresh, jti = create_refresh_token(host.id)

    db_refresh = RefreshToken(
        host_id=host.id,
        token_hash=hash_token(raw_refresh),
        expires_at=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_expire_days),
    )
    session.add(db_refresh)
    await session.commit()

    set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        host=HostResponse.model_validate(host),
    )


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    response: Response,
    memoire_refresh: Annotated[str | None, Cookie()] = None,
    session: AsyncSession = Depends(get_session),
) -> dict:
    if not memoire_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        payload = jwt.decode(memoire_refresh, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise ValueError()
    except Exception:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    token_hash = hash_token(memoire_refresh)
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(UTC),
        )
    )
    db_token = result.scalar_one_or_none()

    if not db_token:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    # Revoke old token
    db_token.revoked = True

    # Get host
    host_result = await session.execute(select(Host).where(Host.id == db_token.host_id))
    host = host_result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Host not found")

    # Issue new tokens
    access_token = create_access_token(host.id, host.email)
    new_raw_refresh, new_jti = create_refresh_token(host.id)

    new_db_refresh = RefreshToken(
        host_id=host.id,
        token_hash=hash_token(new_raw_refresh),
        expires_at=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_expire_days),
    )
    session.add(new_db_refresh)
    await session.commit()

    set_refresh_cookie(response, new_raw_refresh)

    return {"access_token": access_token}


@router.post("/logout")
async def logout(
    response: Response,
    memoire_refresh: Annotated[str | None, Cookie()] = None,
    session: AsyncSession = Depends(get_session),
) -> dict:
    if memoire_refresh:
        token_hash = hash_token(memoire_refresh)
        result = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        db_token = result.scalar_one_or_none()
        if db_token:
            db_token.revoked = True
            await session.commit()

    clear_refresh_cookie(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=HostResponse)
async def get_me(current_host: Annotated[Host, Depends(get_current_host)]) -> HostResponse:
    return HostResponse.model_validate(current_host)
