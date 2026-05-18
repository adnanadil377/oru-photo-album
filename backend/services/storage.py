import re

import boto3

from config import settings


def sanitize_filename(filename: str) -> str:
    stem = filename.strip().lower().replace(" ", "-")
    stem = re.sub(r"[^a-z0-9._-]+", "", stem)
    stem = re.sub(r"-{2,}", "-", stem).strip(".-")
    return stem or "photo"


class R2StorageService:
    def __init__(self) -> None:
        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
        self.bucket = settings.r2_bucket_name
        self.public_domain = settings.r2_public_domain

    def generate_presigned_upload_url(
        self, object_key: str, mime_type: str, expires_in: int = 300
    ) -> str:
        # The browser uploads directly to R2 with this short-lived URL; FastAPI never sees file bytes.
        return self.client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": object_key, "ContentType": mime_type},
            ExpiresIn=expires_in,
        )

    def get_public_url(self, object_key: str) -> str:
        return f"https://{self.public_domain}/{object_key}"

    def delete_object(self, object_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=object_key)
