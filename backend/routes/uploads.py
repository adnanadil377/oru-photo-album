import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from middleware.rate_limit import limiter
from models import Event, GuestSession, Upload
from schemas import CompleteUploadRequest, GalleryResponse, UploadRequest, UploadRequestResponse, UploadResponse
from services.limits import ensure_complete_upload_allowed, ensure_event_active, ensure_request_upload_allowed
from services.security import verify_password
from services.storage import R2StorageService, sanitize_filename


router = APIRouter(prefix="/events/{slug}", tags=["uploads"])
storage_service = R2StorageService()


async def load_event(
    session: AsyncSession,
    slug: str,
    password: str | None = None,
    lock: bool = False,
) -> Event:
    statement = select(Event).where(Event.slug == slug)
    if lock:
        statement = statement.with_for_update()
    result = await session.execute(statement)
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="event_not_found")
    ensure_event_active(event)
    if event.password_hash and not password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="password_required")
    if event.password_hash and not verify_password(password, event.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="wrong_password")
    return event


async def get_or_create_guest_session(session: AsyncSession, event: Event, session_id: str, lock: bool = False) -> GuestSession:
    statement = select(GuestSession).where(
        GuestSession.event_id == event.id,
        GuestSession.session_id == session_id,
    )
    if lock:
        statement = statement.with_for_update()
    result = await session.execute(statement)
    guest_session = result.scalar_one_or_none()
    if guest_session:
        return guest_session

    guest_session = GuestSession(event_id=event.id, session_id=session_id)
    session.add(guest_session)
    await session.flush()
    return guest_session


def ensure_header_matches_body(header_session_id: str | None, body_session_id: str) -> None:
    if header_session_id and header_session_id != body_session_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session_mismatch")


def to_upload_response(upload: Upload) -> UploadResponse:
    if upload.file_url is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="upload_not_complete")
    return UploadResponse(
        id=upload.id,
        guest_session_id=upload.guest_session_id,
        file_url=upload.file_url,
        object_key=upload.object_key,
        compressed=upload.compressed,
        mime_type=upload.mime_type,
        file_size=upload.file_size,
        created_at=upload.created_at,
    )


@router.post("/request-upload", response_model=UploadRequestResponse)
@limiter.limit("10/minute")
async def request_upload(
    slug: str,
    payload: UploadRequest,
    request: Request,
    x_session_id: Annotated[str | None, Header(alias="X-Session-ID")] = None,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> UploadRequestResponse:
    ensure_header_matches_body(x_session_id, payload.guest_session_id)
    event = await load_event(session, slug, password=x_event_password)
    guest_session = await get_or_create_guest_session(session, event, payload.guest_session_id)
    ensure_request_upload_allowed(event, guest_session, payload.mime_type, payload.file_size)

    upload_id = uuid.uuid4()
    safe_filename = sanitize_filename(payload.file_name)
    object_key = f"uploads/{event.slug}/{upload_id}/{safe_filename}"
    upload = Upload(
        id=upload_id,
        event_id=event.id,
        guest_session_id=payload.guest_session_id,
        object_key=object_key,
        mime_type=payload.mime_type,
        file_size=payload.file_size,
        status="pending",
    )
    session.add(upload)

    signed_url = storage_service.generate_presigned_upload_url(object_key, payload.mime_type)
    await session.commit()

    return UploadRequestResponse(upload_id=upload_id, signed_url=signed_url, object_key=object_key)


@router.post("/complete-upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def complete_upload(
    slug: str,
    payload: CompleteUploadRequest,
    request: Request,
    x_session_id: Annotated[str | None, Header(alias="X-Session-ID")] = None,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> UploadResponse:
    ensure_header_matches_body(x_session_id, payload.guest_session_id)
    event = await load_event(session, slug, password=x_event_password, lock=True)
    guest_session = await get_or_create_guest_session(session, event, payload.guest_session_id, lock=True)

    upload_result = await session.execute(
        select(Upload)
        .where(Upload.id == payload.upload_id, Upload.event_id == event.id)
        .with_for_update()
    )
    upload = upload_result.scalar_one_or_none()
    if upload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="upload_not_found")
    if upload.guest_session_id != payload.guest_session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="upload_session_mismatch")
    if upload.status == "complete":
        return to_upload_response(upload)

    ensure_complete_upload_allowed(event, guest_session, payload.file_size)

    upload.status = "complete"
    upload.file_size = payload.file_size
    upload.compressed = payload.compressed
    upload.file_url = storage_service.get_public_url(upload.object_key)

    event.current_uploads += 1
    event.current_storage_bytes += payload.file_size
    guest_session.upload_count += 1
    guest_session.total_uploaded_bytes += payload.file_size
    guest_session.last_seen_at = datetime.now(UTC)

    await session.commit()
    await session.refresh(upload)
    return to_upload_response(upload)


@router.get("/gallery", response_model=GalleryResponse)
@limiter.limit("30/minute")
async def get_gallery(
    slug: str,
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=60),
    password: str | None = None,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> GalleryResponse:
    event = await load_event(session, slug, password=password or x_event_password)
    offset = (page - 1) * limit

    total_result = await session.execute(
        select(func.count()).select_from(Upload).where(Upload.event_id == event.id, Upload.status == "complete")
    )
    total = int(total_result.scalar_one())

    uploads_result = await session.execute(
        select(Upload)
        .where(Upload.event_id == event.id, Upload.status == "complete")
        .order_by(Upload.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    uploads = [to_upload_response(upload) for upload in uploads_result.scalars().all()]
    return GalleryResponse(
        uploads=uploads,
        page=page,
        limit=limit,
        total=total,
        has_more=offset + len(uploads) < total,
    )
