from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, require_permission
from app.core import permission_codes as P
from app.models import DashboardPublic, DashboardsPublic
from app.services.dashboards import get_dashboard_by_slug, list_dashboards

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

_read = [Depends(require_permission(P.DASHBOARD_READ))]


@router.get("/", response_model=DashboardsPublic, dependencies=_read)
def read_dashboards(session: SessionDep) -> Any:
    rows = list_dashboards(session)
    return DashboardsPublic(
        data=[DashboardPublic.model_validate(r) for r in rows],
        count=len(rows),
    )


@router.get("/{slug}", response_model=DashboardPublic, dependencies=_read)
def read_dashboard(session: SessionDep, slug: str) -> Any:
    row = get_dashboard_by_slug(session, slug)
    if not row:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return row
