from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep, require_permission
from app.core import permission_codes as P
from app.models import Message, SilenceCreate, SilencesPublic
from app.services.audit import record_audit
from app.services.silences import create_silence, delete_silence, list_silences

router = APIRouter(prefix="/alerts/silences", tags=["silences"])

_read = [Depends(require_permission(P.ALERTS_READ))]
_manage = [Depends(require_permission(P.ALERTS_MANAGE))]


@router.get("/", response_model=SilencesPublic, dependencies=_read)
def read_silences(
    session: SessionDep,
    active_only: bool = Query(default=False),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    data, count = list_silences(
        session, active_only=active_only, skip=skip, limit=limit
    )
    return SilencesPublic(data=data, count=count)


@router.post("/", dependencies=_manage)
def add_silence(
    session: SessionDep, current_user: CurrentUser, body: SilenceCreate
) -> Any:
    try:
        row = create_silence(session, body, created_by=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    record_audit(
        session,
        user_id=current_user.id,
        action="create",
        resource_type="silence",
        resource_id=str(row.id),
        detail=row.reason,
    )
    return {"id": str(row.id), "message": "Silence created"}


@router.delete("/{id}", dependencies=_manage)
def remove_silence(
    session: SessionDep, current_user: CurrentUser, id: UUID
) -> Message:
    if not delete_silence(session, id):
        raise HTTPException(status_code=404, detail="Silence not found")
    record_audit(
        session,
        user_id=current_user.id,
        action="delete",
        resource_type="silence",
        resource_id=str(id),
    )
    return Message(message="Silence deleted")
