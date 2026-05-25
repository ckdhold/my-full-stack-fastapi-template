import uuid

from sqlmodel import Session, col, func, select

from app.models import AuditLog, AuditLogPublic, User


def record_audit(
    session: Session,
    *,
    user_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    detail: str | None = None,
) -> AuditLog:
    row = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def audit_to_public(session: Session, row: AuditLog) -> AuditLogPublic:
    user_email = None
    if row.user_id:
        user = session.get(User, row.user_id)
        user_email = user.email if user else None
    return AuditLogPublic(
        id=row.id,
        user_id=row.user_id,
        user_email=user_email,
        action=row.action,
        resource_type=row.resource_type,
        resource_id=row.resource_id,
        detail=row.detail,
        created_at=row.created_at,
    )


def list_audit_logs(
    session: Session, *, skip: int = 0, limit: int = 100
) -> tuple[list[AuditLogPublic], int]:
    count = session.exec(select(func.count()).select_from(AuditLog)).one()
    rows = session.exec(
        select(AuditLog)
        .order_by(col(AuditLog.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return [audit_to_public(session, row) for row in rows], count
