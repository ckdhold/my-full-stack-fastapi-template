from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, SessionDep, require_permission
from app.core import permission_codes as P
from app.models import (
    ApiTokenCreate,
    ApiTokenCreatedPublic,
    ApiTokensPublic,
    Message,
)
from app.services.audit import record_audit
from app.services.tokens import (
    create_api_token,
    delete_api_token,
    list_api_tokens,
    token_to_public,
)

router = APIRouter(prefix="/tokens", tags=["tokens"])

_read = [Depends(require_permission(P.TOKENS_MANAGE))]
_write = [Depends(require_permission(P.TOKENS_MANAGE))]


@router.get("/", response_model=ApiTokensPublic, dependencies=_read)
def read_tokens(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    data, count = list_api_tokens(session, skip=skip, limit=limit)
    return ApiTokensPublic(data=data, count=count)


@router.post("/", response_model=ApiTokenCreatedPublic, dependencies=_write)
def create_token(
    session: SessionDep, current_user: CurrentUser, body: ApiTokenCreate
) -> Any:
    try:
        row, plain = create_api_token(session, body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    record_audit(
        session,
        user_id=current_user.id,
        action="create",
        resource_type="api_token",
        resource_id=str(row.id),
        detail=row.name,
    )
    public = token_to_public(session, row)
    return ApiTokenCreatedPublic(**public.model_dump(), token=plain)


@router.delete("/{id}", dependencies=_write)
def remove_token(session: SessionDep, current_user: CurrentUser, id: UUID) -> Message:
    row_deleted = delete_api_token(session, id)
    if not row_deleted:
        raise HTTPException(status_code=404, detail="Token not found")
    record_audit(
        session,
        user_id=current_user.id,
        action="delete",
        resource_type="api_token",
        resource_id=str(id),
    )
    return Message(message="Token deleted")
