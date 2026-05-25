from typing import Any
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.deps import SessionDep, require_permission
from app.core import permission_codes as P
from app.models import EventsPublic
from app.services.events import query_events

router = APIRouter(prefix="/events", tags=["events"])

_read = [Depends(require_permission(P.DASHBOARD_READ))]


@router.get("/", response_model=EventsPublic, dependencies=_read)
def read_events(
    session: SessionDep,
    type: str | None = Query(default=None),
    target_id: UUID | None = Query(default=None),
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    data, count = query_events(
        session,
        type=type,
        target_id=target_id,
        since=since,
        until=until,
        skip=skip,
        limit=limit,
    )
    return EventsPublic(data=data, count=count)
