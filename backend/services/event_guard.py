from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from models import Event
from services.limits import ensure_event_active
from services.security import verify_password

async def get_verified_event(
    session: AsyncSession,
    slug: str,
    password: str | None = None,
    active_only: bool = True,
    check_password: bool = True,
    lock: bool = False,
) -> Event:
    statement = select(Event).where(Event.slug == slug)
    if lock:
        statement = statement.with_for_update()
        
    result = await session.execute(statement)
    event = result.scalar_one_or_none()
    
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="event_not_found")
        
    if active_only:
        ensure_event_active(event)
        
    if check_password and event.password_hash:
        if not password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="password_required")
        if not verify_password(password, event.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="wrong_password")
            
    return event
