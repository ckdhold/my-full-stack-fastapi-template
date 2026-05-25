import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import SessionDep, require_permission
from app.core import permission_codes as P
from app.models import (
    Message,
    Target,
    TargetCreate,
    TargetPublic,
    TargetsPublic,
    TargetStatus,
    TargetSummary,
    TargetType,
    TargetUpdate,
)

router = APIRouter(prefix="/targets", tags=["targets"])

_read = [Depends(require_permission(P.TARGETS_READ))]
_write = [Depends(require_permission(P.TARGETS_WRITE))]

VALID_TYPES = {
    TargetType.HOST,
    TargetType.HTTP,
    TargetType.TCP,
    TargetType.DATABASE,
    TargetType.BUSINESS,
    TargetType.CUSTOM,
}
VALID_STATUSES = {
    TargetStatus.ONLINE,
    TargetStatus.OFFLINE,
    TargetStatus.UNKNOWN,
    TargetStatus.ALERT,
}


def _validate_type(value: str) -> None:
    if value not in VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid target type: {value}")


def _validate_status(value: str) -> None:
    if value not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid target status: {value}")


@router.get("/summary", response_model=TargetSummary, dependencies=_read)
def read_targets_summary(session: SessionDep) -> Any:
    total = session.exec(select(func.count()).select_from(Target)).one()
    rows = session.exec(
        select(Target.status, func.count()).group_by(Target.status)
    ).all()
    counts = {status: count for status, count in rows}
    return TargetSummary(
        total=total,
        online=counts.get(TargetStatus.ONLINE, 0),
        offline=counts.get(TargetStatus.OFFLINE, 0),
        alert=counts.get(TargetStatus.ALERT, 0),
        unknown=counts.get(TargetStatus.UNKNOWN, 0),
    )


@router.get("/", response_model=TargetsPublic, dependencies=_read)
def read_targets(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> Any:
    statement = select(Target)
    count_statement = select(func.count()).select_from(Target)

    if type:
        _validate_type(type)
        statement = statement.where(Target.type == type)
        count_statement = count_statement.where(Target.type == type)
    if status:
        _validate_status(status)
        statement = statement.where(Target.status == status)
        count_statement = count_statement.where(Target.status == status)
    if search:
        statement = statement.where(col(Target.name).ilike(f"%{search}%"))
        count_statement = count_statement.where(col(Target.name).ilike(f"%{search}%"))

    count = session.exec(count_statement).one()
    targets = session.exec(
        statement.order_by(col(Target.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return TargetsPublic(
        data=[TargetPublic.model_validate(t) for t in targets],
        count=count,
    )


@router.get("/{id}", response_model=TargetPublic, dependencies=_read)
def read_target(session: SessionDep, id: uuid.UUID) -> Any:
    target = session.get(Target, id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@router.post("/", response_model=TargetPublic, dependencies=_write)
def create_target(*, session: SessionDep, target_in: TargetCreate) -> Any:
    _validate_type(target_in.type)
    status = target_in.status or TargetStatus.UNKNOWN
    _validate_status(status)
    now = datetime.now(timezone.utc)
    target = Target.model_validate(
        target_in,
        update={"status": status, "created_at": now, "updated_at": now},
    )
    session.add(target)
    session.commit()
    session.refresh(target)
    return target


@router.put("/{id}", response_model=TargetPublic, dependencies=_write)
def update_target(
    *, session: SessionDep, id: uuid.UUID, target_in: TargetUpdate
) -> Any:
    target = session.get(Target, id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    update_dict = target_in.model_dump(exclude_unset=True)
    if "type" in update_dict and update_dict["type"] is not None:
        _validate_type(update_dict["type"])
    if "status" in update_dict and update_dict["status"] is not None:
        _validate_status(update_dict["status"])
    update_dict["updated_at"] = datetime.now(timezone.utc)
    target.sqlmodel_update(update_dict)
    session.add(target)
    session.commit()
    session.refresh(target)
    return target


@router.delete("/{id}", dependencies=_write)
def delete_target(session: SessionDep, id: uuid.UUID) -> Message:
    target = session.get(Target, id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    session.delete(target)
    session.commit()
    return Message(message="Target deleted successfully")
