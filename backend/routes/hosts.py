from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import Event, Host
from routes.events import to_event_response
from schemas import EventResponse
from services.auth import get_current_host

router = APIRouter(prefix="/hosts", tags=["hosts"])

@router.get("/me/events", response_model=list[EventResponse])
async def get_my_events(
    current_host: Annotated[Host, Depends(get_current_host)],
    session: AsyncSession = Depends(get_session),
) -> list[EventResponse]:
    result = await session.execute(
        select(Event)
        .where(Event.host_id == current_host.id)
        .order_by(Event.created_at.desc())
    )
    events = result.scalars().all()
    return [to_event_response(e) for e in events]
