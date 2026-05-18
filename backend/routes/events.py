from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_session
from middleware.rate_limit import limiter
from models import Event
from schemas import EventCreate, EventResponse, QRResponse
from services.limits import ensure_event_active
from services.security import hash_password, verify_password


router = APIRouter(prefix="/events", tags=["events"])


def event_url(slug: str) -> str:
    return f"{settings.frontend_url}/e/{slug}"


def to_event_response(event: Event) -> EventResponse:
    return EventResponse(
        id=event.id,
        title=event.title,
        slug=event.slug,
        expires_at=event.expires_at,
        created_at=event.created_at,
        cover_image_url=event.cover_image_url,
        max_uploads=event.max_uploads,
        current_uploads=event.current_uploads,
        max_storage_bytes=event.max_storage_bytes,
        current_storage_bytes=event.current_storage_bytes,
        requires_password=event.password_hash is not None,
        event_url=event_url(event.slug),
    )


async def load_event(session: AsyncSession, slug: str) -> Event:
    result = await session.execute(select(Event).where(Event.slug == slug))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="event_not_found")
    ensure_event_active(event)
    return event


def require_event_password(event: Event, password: str | None) -> None:
    if event.password_hash and not password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="password_required")
    if event.password_hash and not verify_password(password or "", event.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="wrong_password")


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_event(
    request: Request,
    payload: EventCreate,
    session: AsyncSession = Depends(get_session),
) -> EventResponse:
    existing_result = await session.execute(select(Event.id).where(Event.slug == payload.slug))
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="slug_already_exists")

    event = Event(
        title=payload.title,
        slug=payload.slug,
        expires_at=payload.expires_at,
        max_uploads=payload.max_uploads,
        password_hash=hash_password(payload.password) if payload.password else None,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return to_event_response(event)


@router.get("/{slug}", response_model=EventResponse)
async def get_event(
    slug: str,
    request: Request,
    password: str | None = None,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> EventResponse:
    event = await load_event(session, slug)
    require_event_password(event, password or x_event_password)
    return to_event_response(event)


@router.get("/{slug}/qr", response_model=QRResponse)
async def get_event_qr(
    slug: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> QRResponse:
    event = await load_event(session, slug)
    return QRResponse(url=event_url(event.slug))
