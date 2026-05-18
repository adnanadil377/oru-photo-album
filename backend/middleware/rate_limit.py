from fastapi import Request
from slowapi import Limiter


def session_or_ip_key(request: Request) -> str:
    slug = request.path_params.get("slug")
    session_id = request.headers.get("X-Session-ID")
    client_host = request.client.host if request.client else "unknown"
    actor = session_id or client_host
    return f"{slug}:{actor}" if slug else actor


limiter = Limiter(key_func=session_or_ip_key)
