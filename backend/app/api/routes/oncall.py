import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, SessionDep, require_permission
from app.core import permission_codes as P
from app.models import (
    Message,
    OncallContact,
    OncallContactCreate,
    OncallContactPublic,
    OncallContactsPublic,
    OncallContactUpdate,
)
from sqlmodel import func, select

router = APIRouter(prefix="/notifications/oncall", tags=["oncall"])

_read = [Depends(require_permission(P.NOTIFICATIONS_READ))]
_manage = [Depends(require_permission(P.NOTIFICATIONS_MANAGE))]


@router.get("/", response_model=OncallContactsPublic, dependencies=_read)
def read_oncall_contacts(session: SessionDep) -> Any:
    rows = session.exec(
        select(OncallContact).order_by(OncallContact.sort_order, OncallContact.name)
    ).all()
    return OncallContactsPublic(
        data=[OncallContactPublic.model_validate(r) for r in rows],
        count=len(rows),
    )


@router.post("/", response_model=OncallContactPublic, dependencies=_manage)
def create_oncall_contact(
    session: SessionDep, body: OncallContactCreate
) -> Any:
    row = OncallContact.model_validate(body)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.put("/{id}", response_model=OncallContactPublic, dependencies=_manage)
def update_oncall_contact(
    session: SessionDep, id: uuid.UUID, body: OncallContactUpdate
) -> Any:
    row = session.get(OncallContact, id)
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    row.sqlmodel_update(body.model_dump(exclude_unset=True))
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.delete("/{id}", dependencies=_manage)
def delete_oncall_contact(session: SessionDep, id: uuid.UUID) -> Message:
    row = session.get(OncallContact, id)
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    session.delete(row)
    session.commit()
    return Message(message="Contact deleted")
