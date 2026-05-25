from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import SessionDep, require_permission
from app.core import permission_codes as P
from app.models import AuditLogsPublic
from app.services.audit import list_audit_logs

router = APIRouter(prefix="/audit", tags=["audit"])

_read = [Depends(require_permission(P.AUDIT_READ))]


@router.get("/", response_model=AuditLogsPublic, dependencies=_read)
def read_audit_logs(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    data, count = list_audit_logs(session, skip=skip, limit=limit)
    return AuditLogsPublic(data=data, count=count)
