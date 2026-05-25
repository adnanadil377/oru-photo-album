import re
import uuid
from datetime import UTC, datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, EmailStr


SLUG_PATTERN = re.compile(r"^[a-z0-9-]{1,60}$")
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/heic", "image/webp", "video/mp4", "video/quicktime", "video/webm"}
MAX_PHOTO_SIZE = 20 * 1024 * 1024
MAX_VIDEO_SIZE = 500 * 1024 * 1024


def as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    slug: str = Field(min_length=1, max_length=60)
    expires_at: datetime
    start_time: datetime | None = None
    cover_image_url: str | None = None
    max_uploads: int = Field(default=500, ge=1, le=5000)
    password: str | None = Field(default=None, min_length=4, max_length=128)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @field_validator("slug")
    @classmethod
    def clean_slug(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not SLUG_PATTERN.fullmatch(normalized):
            raise ValueError("Slug may only contain lowercase letters, numbers, and hyphens")
        return normalized

    @field_validator("expires_at")
    @classmethod
    def ensure_future_expiry(cls, value: datetime) -> datetime:
        normalized = as_aware_utc(value)
        if normalized <= datetime.now(UTC):
            raise ValueError("Expiration date must be in the future")
        return normalized


class HostCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=2, max_length=60)


class HostResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    host: HostResponse


class EventResponse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    expires_at: datetime
    start_time: datetime | None
    created_at: datetime
    cover_image_url: str | None
    max_uploads: int
    current_uploads: int
    max_storage_bytes: int
    current_storage_bytes: int
    requires_password: bool
    event_url: str
    host_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class EventUpdate(BaseModel):
    expires_at: datetime | None = None
    start_time: datetime | None = None
    max_uploads: int | None = Field(default=None, ge=1, le=5000)
    cover_image_url: str | None = None
    
    @field_validator("expires_at")
    @classmethod
    def ensure_future_expiry(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        normalized = as_aware_utc(value)
        if normalized <= datetime.now(UTC):
            raise ValueError("Expiration date must be in the future")
        return normalized


class UploadRequest(BaseModel):
    guest_session_id: str
    guest_name: str | None = Field(default=None, max_length=100)
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str
    file_size: int = Field(gt=0)

    @field_validator("guest_session_id")
    @classmethod
    def validate_session_id(cls, value: str) -> str:
        uuid.UUID(value)
        return value


class UploadRequestResponse(BaseModel):
    upload_id: uuid.UUID
    signed_url: str
    object_key: str
    expires_in: int = 300


class CompleteUploadRequest(BaseModel):
    upload_id: uuid.UUID
    guest_session_id: str
    file_size: int = Field(gt=0)
    compressed: bool

    @field_validator("guest_session_id")
    @classmethod
    def validate_session_id(cls, value: str) -> str:
        uuid.UUID(value)
        return value


class UploadResponse(BaseModel):
    id: uuid.UUID
    guest_session_id: str
    guest_name: str | None
    file_url: str
    object_key: str
    compressed: bool
    mime_type: str
    media_type: Literal["photo", "video"]
    file_size: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GalleryResponse(BaseModel):
    uploads: list[UploadResponse]
    page: int
    limit: int
    total: int
    has_more: bool


class QRResponse(BaseModel):
    url: str
