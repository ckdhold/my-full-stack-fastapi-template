import uuid
from datetime import datetime, timezone

from sqlmodel import Session, col, func, select

from app.models import Event, EventPublic, Target


def emit_event(
    session: Session,
    *,
    type: str,
    message: str,
    target_id: uuid.UUID | None = None,
    alert_id: uuid.UUID | None = None,
    meta_json: dict | None = None,
) -> Event:
    event = Event(
        type=type,
        message=message,
        target_id=target_id,
        alert_id=alert_id,
        meta_json=meta_json or {},
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def event_to_public(session: Session, event: Event) -> EventPublic:
    target_name = None
    if event.target_id:
        target = session.get(Target, event.target_id)
        target_name = target.name if target else None
    return EventPublic(
        **event.model_dump(),
        target_name=target_name,
    )


def query_events(
    session: Session,
    *,
    type: str | None = None,
    target_id: uuid.UUID | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[EventPublic], int]:
    statement = select(Event)
    count_statement = select(func.count()).select_from(Event)

    if type:
        statement = statement.where(Event.type == type)
        count_statement = count_statement.where(Event.type == type)
    if target_id:
        statement = statement.where(Event.target_id == target_id)
        count_statement = count_statement.where(Event.target_id == target_id)
    if since:
        statement = statement.where(col(Event.created_at) >= since)
        count_statement = count_statement.where(col(Event.created_at) >= since)
    if until:
        statement = statement.where(col(Event.created_at) <= until)
        count_statement = count_statement.where(col(Event.created_at) <= until)

    count = session.exec(count_statement).one()
    rows = session.exec(
        statement.order_by(col(Event.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return [event_to_public(session, row) for row in rows], count
