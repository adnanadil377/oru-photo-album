from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from stream_zip import async_stream_zip, ZIP_32

from config import settings
from database import get_session
from models import Event, Host, Upload
from schemas import EventCreate, EventResponse, EventUpdate, QRResponse
from services.security import hash_password
from services.auth import get_current_host
from services.event_guard import get_verified_event


router = APIRouter(prefix="/events", tags=["events"])


def event_url(slug: str) -> str:
    return f"{settings.frontend_url}/e/{slug}"


def to_event_response(event: Event) -> EventResponse:
    return EventResponse(
        id=event.id,
        title=event.title,
        slug=event.slug,
        expires_at=event.expires_at,
        start_time=event.start_time,
        created_at=event.created_at,
        cover_image_url=event.cover_image_url,
        max_uploads=event.max_uploads,
        current_uploads=event.current_uploads,
        max_storage_bytes=event.max_storage_bytes,
        current_storage_bytes=event.current_storage_bytes,
        requires_password=event.password_hash is not None,
        event_url=event_url(event.slug),
        host_id=event.host_id,
    )


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    request: Request,
    payload: EventCreate,
    current_host: Annotated[Host, Depends(get_current_host)],
    session: AsyncSession = Depends(get_session),
) -> EventResponse:
    existing_result = await session.execute(select(Event.id).where(Event.slug == payload.slug))
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="slug_already_exists")

    event = Event(
        title=payload.title,
        slug=payload.slug,
        expires_at=payload.expires_at,
        start_time=payload.start_time,
        max_uploads=payload.max_uploads,
        cover_image_url=payload.cover_image_url,
        password_hash=hash_password(payload.password) if payload.password else None,
        host_id=current_host.id,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return to_event_response(event)


@router.get("/batch", response_model=list[EventResponse])
async def get_events_batch(
    slugs: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> list[EventResponse]:
    slug_list = [s.strip() for s in slugs.split(",") if s.strip()]
    if not slug_list:
        return []
        
    result = await session.execute(select(Event).where(Event.slug.in_(slug_list)))
    events = result.scalars().all()
    return [to_event_response(event) for event in events]


@router.get("/{slug}", response_model=EventResponse)
async def get_event(
    slug: str,
    request: Request,
    password: str | None = None,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> EventResponse:
    event = await get_verified_event(session, slug, password=password or x_event_password)
    return to_event_response(event)


@router.patch("/{slug}", response_model=EventResponse)
async def update_event(
    slug: str,
    payload: EventUpdate,
    request: Request,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> EventResponse:
    event = await get_verified_event(session, slug, password=x_event_password, active_only=False)

    if payload.expires_at is not None:
        event.expires_at = payload.expires_at
    if payload.start_time is not None:
        event.start_time = payload.start_time
    if payload.max_uploads is not None:
        event.max_uploads = payload.max_uploads
    if payload.cover_image_url is not None:
        event.cover_image_url = payload.cover_image_url

    await session.commit()
    await session.refresh(event)
    return to_event_response(event)


@router.get("/{slug}/qr", response_model=QRResponse)
async def get_event_qr(
    slug: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> QRResponse:
    event = await get_verified_event(session, slug, active_only=False, check_password=False)
    return QRResponse(url=event_url(event.slug))


@router.get("/{slug}/download-zip")
async def download_zip(
    slug: str,
    request: Request,
    part: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    event = await get_verified_event(session, slug, active_only=False, check_password=False)
    
    limit = 500
    offset = part * limit
    
    uploads_result = await session.execute(
        select(Upload)
        .where(Upload.event_id == event.id, Upload.status == "complete")
        .order_by(Upload.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    uploads = uploads_result.scalars().all()

    if not uploads:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no_photos_found")

    async def get_files():
        from services.storage import R2StorageService
        storage_service = R2StorageService()
        async with httpx.AsyncClient() as client:
            for upload in uploads:
                file_url = storage_service.get_public_url(upload.object_key)
                filename = upload.object_key.split('/')[-1]
                
                async def file_stream(url):
                    async with client.stream('GET', url) as response:
                        response.raise_for_status()
                        async for chunk in response.aiter_bytes(chunk_size=65536):
                            yield chunk
                            
                yield filename, upload.created_at, 0o600, ZIP_32, file_stream(file_url)

    zip_filename = f"{event.slug}-part{part+1}.zip" if part > 0 else f"{event.slug}.zip"
    
    return StreamingResponse(
        async_stream_zip(get_files()),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )
