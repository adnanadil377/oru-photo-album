from datetime import UTC, datetime

from fastapi import HTTPException, status

from models import Event, GuestSession
from schemas import ALLOWED_MIME_TYPES, MAX_FILE_SIZE, as_aware_utc


MAX_GUEST_UPLOADS = 30


def ensure_event_active(event: Event) -> None:
    now = datetime.now(UTC)
    if as_aware_utc(event.expires_at) <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="event_expired",
        )
    if event.start_time and as_aware_utc(event.start_time) > now:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="event_not_started",
        )


def ensure_request_upload_allowed(event: Event, guest_session: GuestSession, mime_type: str, file_size: int) -> None:
    ensure_event_active(event)

    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="file_type_not_allowed")

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="file_too_large")

    if guest_session.upload_count >= MAX_GUEST_UPLOADS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="guest_upload_limit_reached")

    if event.current_uploads >= event.max_uploads:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="event_upload_cap_reached")

    if event.current_storage_bytes + file_size >= event.max_storage_bytes:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="event_storage_cap_reached")


def ensure_complete_upload_allowed(event: Event, guest_session: GuestSession, file_size: int) -> None:
    ensure_event_active(event)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="file_too_large")

    if guest_session.upload_count >= MAX_GUEST_UPLOADS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="guest_upload_limit_reached")

    if event.current_uploads >= event.max_uploads:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="event_upload_cap_reached")

    if event.current_storage_bytes + file_size >= event.max_storage_bytes:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="event_storage_cap_reached")
