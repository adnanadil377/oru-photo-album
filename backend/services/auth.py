import hashlib
import uuid
from datetime import datetime, timedelta, UTC
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_session
from models import Host


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
security = HTTPBearer()


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(host_id: uuid.UUID, email: str) -> str:
    expires_delta = timedelta(minutes=settings.jwt_access_expire_minutes)
    expire = datetime.now(UTC) + expires_delta
    to_encode = {"sub": str(host_id), "email": email, "type": "access", "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt


def create_refresh_token(host_id: uuid.UUID) -> tuple[str, str]:
    jti = str(uuid.uuid4())
    expires_delta = timedelta(days=settings.jwt_refresh_expire_days)
    expire = datetime.now(UTC) + expires_delta
    to_encode = {"sub": str(host_id), "jti": jti, "type": "refresh", "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt, jti


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_host(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    session: AsyncSession = Depends(get_session),
) -> Host:
    token = credentials.credentials
    payload = decode_access_token(token)
    host_id_str = payload.get("sub")
    if host_id_str is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    try:
        host_id = uuid.UUID(host_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid host id")
        
    result = await session.execute(select(Host).where(Host.id == host_id))
    host = result.scalar_one_or_none()
    if host is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Host not found")
        
    return host
