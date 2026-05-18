# Memoire

Memoire is a production-quality MVP for collecting wedding and event guest photos. Hosts create a temporary event page, share a QR code or link, and guests upload images from their phones without an account or app install.

![Screenshot placeholder](https://placehold.co/1400x900/FDFAF6/1C1917?text=Memoire+screenshot)

## Architecture

The upload path is intentionally direct-to-storage:

1. Guest selects photos in the browser.
2. The browser compresses images client-side with `browser-image-compression`.
3. The frontend calls `POST /events/{slug}/request-upload`.
4. FastAPI validates event state, MIME type, file size, guest quota, and event quota.
5. FastAPI returns a 5-minute Cloudflare R2 presigned PUT URL.
6. The browser uploads the binary file directly to R2.
7. The frontend calls `POST /events/{slug}/complete-upload`.
8. FastAPI records metadata and increments counters.

FastAPI never receives photo binary data.

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui-style primitives
- Framer Motion
- `browser-image-compression`
- `qrcode.react`
- `react-masonry-css`
- FastAPI
- PostgreSQL through Supabase
- SQLAlchemy async + asyncpg
- Pydantic v2
- SlowAPI
- boto3 with Cloudflare R2
- Docker + docker-compose

## Prerequisites

- Node 18+
- Python 3.11+
- Docker
- Cloudflare account
- Supabase account

## Cloudflare R2 Setup

1. Create an R2 bucket in the Cloudflare dashboard.
2. Enable public access:
   - Use an `r2.dev` subdomain for development, or
   - Connect a custom domain for production.
3. Add this CORS policy to the bucket:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

4. Create an R2 API token with Object Read & Write permissions.
5. Copy these values:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Bucket Name
   - Public Domain, such as `pub-xxxx.r2.dev` or `photos.yourdomain.com`

Do not use the private S3 API endpoint as `R2_PUBLIC_DOMAIN`. This value is wrong for gallery images:

```text
<account-id>.r2.cloudflarestorage.com
```

Use the public bucket domain shown under public access instead, such as:

```text
pub-xxxx.r2.dev
```

## Supabase Setup

1. Create a Supabase project.
2. Open Project Settings → Database.
3. Copy the PostgreSQL connection string.
4. Convert it to async SQLAlchemy format:

```text
postgresql+asyncpg://user:password@host:5432/dbname
```

The backend creates the MVP tables on startup. For production, add Alembic migrations before changing schema over time.

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Fill in:

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=memoire-uploads
R2_PUBLIC_DOMAIN=pub-xxxx.r2.dev

CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development

VITE_API_URL=http://localhost:8000
```

## Run Locally

```bash
docker-compose up --build
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

## Local Development Without Docker

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## API Overview

### `POST /events`

Creates an event.

Body:

```json
{
  "title": "Ava & Noor",
  "slug": "ava-noor",
  "expires_at": "2026-06-01T18:00:00.000Z",
  "max_uploads": 500,
  "password": "optional"
}
```

### `GET /events/{slug}`

Returns event details. If the event is password-protected, pass `password` as a query parameter or `X-Event-Password` as a header.

### `POST /events/{slug}/request-upload`

Returns a presigned R2 PUT URL.

Body:

```json
{
  "guest_session_id": "uuid-from-localstorage",
  "file_name": "photo.webp",
  "mime_type": "image/webp",
  "file_size": 123456
}
```

### `POST /events/{slug}/complete-upload`

Marks a pending upload complete after the browser successfully uploads to R2.

Body:

```json
{
  "upload_id": "upload-uuid",
  "guest_session_id": "uuid-from-localstorage",
  "file_size": 123456,
  "compressed": true
}
```

### `GET /events/{slug}/gallery`

Returns completed uploads only. Query params:

- `page`, default `1`
- `limit`, default `20`

### `GET /events/{slug}/qr`

Returns the guest URL. The frontend renders the QR code with `qrcode.react`.

## Limits And Security

- Allowed MIME types: `image/jpeg`, `image/png`, `image/heic`, `image/webp`
- Maximum upload size: 20MB
- Maximum guest uploads per event: 30
- Presigned upload URL expiry: 300 seconds
- Event slug: lowercase letters, numbers, and hyphens, max 60 characters
- FastAPI CORS is restricted through `CORS_ORIGINS`
- R2 bucket CORS should be restricted to the frontend origin
- Secrets are loaded from environment variables only
- Guest sessions are anonymous UUIDs stored in `localStorage`

## Deployment Notes

Frontend:

- Deploy `frontend` to Vercel.
- Set `VITE_API_URL` to the production backend URL.

Backend:

- Deploy `backend` to Railway or Render.
- Set all backend environment variables.
- Set `FRONTEND_URL` to the production frontend URL.
- Set `CORS_ORIGINS` to the production frontend origin.

Storage:

- Use a custom R2 public domain for production.
- Update the R2 bucket CORS `AllowedOrigins` to include the production frontend.

Database:

- Use Supabase hosted PostgreSQL.
- Keep the SQLAlchemy async URL format with `postgresql+asyncpg`.
