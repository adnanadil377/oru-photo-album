from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import settings
from database import init_db
from middleware.rate_limit import limiter
from routes import events, uploads, auth, hosts


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()
    yield


app = FastAPI(
    title="Memoire API",
    description="Direct-to-R2 guest photo collection API for weddings and events.",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-ID", "X-Event-Password", "Authorization"],
)

app.include_router(auth.router)
app.include_router(hosts.router)
app.include_router(events.router)
app.include_router(uploads.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
