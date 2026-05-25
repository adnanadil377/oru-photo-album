import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pathlib import Path
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import Event, GuestSession, Upload, Host
from schemas import CompleteUploadRequest, GalleryResponse, UploadRequest, UploadRequestResponse, UploadResponse
from services.limits import ensure_complete_upload_allowed, ensure_request_upload_allowed
from services.auth import get_current_host
from services.storage import R2StorageService, sanitize_filename
from services.event_guard import get_verified_event


router = APIRouter(prefix="/events/{slug}", tags=["uploads"])
storage_service = R2StorageService()


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
        media_type=upload.media_type,
        file_size=upload.file_size,
        created_at=upload.created_at,
    )


@router.post("/request-upload", response_model=UploadRequestResponse)
async def request_upload(
    slug: str,
    payload: UploadRequest,
    request: Request,
    x_session_id: Annotated[str | None, Header(alias="X-Session-ID")] = None,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> UploadRequestResponse:
    ensure_header_matches_body(x_session_id, payload.guest_session_id)
    event = await get_verified_event(session, slug, password=x_event_password)
    guest_session = await get_or_create_guest_session(session, event, payload.guest_session_id)
    
    media_type = "video" if payload.mime_type.startswith("video/") else "photo"
    ensure_request_upload_allowed(event, guest_session, payload.mime_type, media_type, payload.file_size)

    upload_id = uuid.uuid4()
    safe_filename = sanitize_filename(payload.file_name)
    file_ext = Path(safe_filename).suffix
    object_key = f"events/{event.id}/{media_type}s/{upload_id}{file_ext}"
    upload = Upload(
        id=upload_id,
        event_id=event.id,
        guest_session_id=payload.guest_session_id,
        object_key=object_key,
        mime_type=payload.mime_type,
        media_type=media_type,
        file_size=payload.file_size,
        status="pending",
    )
    session.add(upload)

    signed_url = storage_service.generate_presigned_upload_url(object_key, payload.mime_type)
    await session.commit()

    return UploadRequestResponse(upload_id=upload_id, signed_url=signed_url, object_key=object_key)


@router.post("/complete-upload", response_model=UploadResponse)
async def complete_upload(
    slug: str,
    payload: CompleteUploadRequest,
    request: Request,
    x_session_id: Annotated[str | None, Header(alias="X-Session-ID")] = None,
    x_event_password: Annotated[str | None, Header(alias="X-Event-Password")] = None,
    session: AsyncSession = Depends(get_session),
) -> UploadResponse:
    ensure_header_matches_body(x_session_id, payload.guest_session_id)
    event = await get_verified_event(session, slug, password=x_event_password, lock=True)
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

    ensure_complete_upload_allowed(event, guest_session, upload.media_type, payload.file_size)

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
async def get_gallery(
    slug: str,
    request: Request,
    current_host: Annotated[Host, Depends(get_current_host)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=60),
    media_type: str | None = Query(default=None, pattern="^(photo|video)$"),
    session: AsyncSession = Depends(get_session),
) -> GalleryResponse:
    event = await get_verified_event(session, slug, active_only=False, check_password=False)
    if event.host_id != current_host.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this gallery")

    offset = (page - 1) * limit

    where_clauses = [Upload.event_id == event.id, Upload.status == "complete"]
    if media_type:
        where_clauses.append(Upload.media_type == media_type)

    total_result = await session.execute(
        select(func.count()).select_from(Upload).where(*where_clauses)
    )
    total = int(total_result.scalar_one())

    uploads_result = await session.execute(
        select(Upload)
        .where(*where_clauses)
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
