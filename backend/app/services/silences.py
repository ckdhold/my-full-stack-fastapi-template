import uuid
from datetime import datetime, timezone

from sqlmodel import Session, col, func, or_, select

from app.models import Silence, SilenceCreate, SilencePublic, Target


def is_silenced(session: Session, target_id: uuid.UUID) -> bool:
    now = datetime.now(timezone.utc)
    row = session.exec(
        select(func.count())
        .select_from(Silence)
        .where(
            Silence.starts_at <= now,
            Silence.ends_at >= now,
            or_(Silence.target_id == target_id, Silence.target_id.is_(None)),  # type: ignore[union-attr]
        )
    ).one()
    return row > 0


def silence_to_public(session: Session, row: Silence) -> SilencePublic:
    target_name = None
    if row.target_id:
        target = session.get(Target, row.target_id)
        target_name = target.name if target else None
    return SilencePublic(**row.model_dump(), target_name=target_name)


def create_silence(
    session: Session, body: SilenceCreate, created_by: uuid.UUID | None
) -> Silence:
    if body.ends_at <= body.starts_at:
        raise ValueError("ends_at must be after starts_at")
    if body.target_id:
        target = session.get(Target, body.target_id)
        if not target:
            raise ValueError("Target not found")
    row = Silence.model_validate(body, update={"created_by": created_by})
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def list_silences(
    session: Session, *, active_only: bool = False, skip: int = 0, limit: int = 100
) -> tuple[list[SilencePublic], int]:
    statement = select(Silence)
    count_statement = select(func.count()).select_from(Silence)
    if active_only:
        now = datetime.now(timezone.utc)
        statement = statement.where(Silence.starts_at <= now, Silence.ends_at >= now)
        count_statement = count_statement.where(
            Silence.starts_at <= now, Silence.ends_at >= now
        )
    count = session.exec(count_statement).one()
    rows = session.exec(
        statement.order_by(col(Silence.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return [silence_to_public(session, row) for row in rows], count


def delete_silence(session: Session, silence_id: uuid.UUID) -> bool:
    row = session.get(Silence, silence_id)
    if not row:
        return False
    session.delete(row)
    session.commit()
    return True
