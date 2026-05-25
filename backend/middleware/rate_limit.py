import re
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from limits import parse

from config import settings


class DummyLimit:
    def __init__(self, limit, error_message=None):
        self.limit = limit
        self.error_message = error_message


def session_or_ip_key(request: Request) -> str:
    # 1. Try to get slug from path_params
    slug = request.path_params.get("slug")
    
    # 2. If not found, try to parse slug from raw URL path
    if not slug:
        path = request.url.path
        parts = path.split("/")
        if len(parts) > 2 and parts[1] == "events":
            slug = parts[2]
            if slug == "batch":
                slug = None

    session_id = request.headers.get("X-Session-ID")
    client_host = request.client.host if request.client else "unknown"
    actor = session_id or client_host
    return f"{slug}:{actor}" if slug else actor


limiter = Limiter(key_func=session_or_ip_key)

RATE_LIMIT_RULES = [
    ("POST", r"^/auth/register$", "3/minute"),
    ("POST", r"^/auth/login$", "5/minute"),
    ("POST", r"^/auth/refresh$", "20/minute"),
    ("POST", r"^/events$", "5/minute"),
    ("POST", r"^/events/[^/]+/request-upload$", "10/minute"),
    ("POST", r"^/events/[^/]+/complete-upload$", "10/minute"),
    ("GET", r"^/events/[^/]+/gallery$", "30/minute"),
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Initialize view_rate_limit to prevent AttributeError in slowapi handler
        request.state.view_rate_limit = None

        if settings.environment == "testing" or not limiter.enabled:
            return await call_next(request)

        path = request.url.path
        method = request.method

        for rule_method, path_regex, limit_str in RATE_LIMIT_RULES:
            if method == rule_method and re.match(path_regex, path):
                limit_item = parse(limit_str)
                key = limiter._key_func(request)
                namespace = f"rate_limit:{rule_method}:{path_regex}"
                
                if not limiter._limiter.hit(limit_item, namespace, key):
                    from fastapi.responses import JSONResponse
                    exc = RateLimitExceeded(DummyLimit(limit_item))
                    response = JSONResponse(
                        {"error": f"Rate limit exceeded: {exc.detail}"},
                        status_code=429
                    )
                    # Inject rate limit headers
                    response = limiter._inject_headers(response, (limit_item, [namespace, key]))
                    return response
                break

        return await call_next(request)


