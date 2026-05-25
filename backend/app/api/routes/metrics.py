import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_permission, SessionDep
from app.core import permission_codes as P
from app.models import MetricSamplesPublic
from app.services.monitoring import query_metric_samples

router = APIRouter(prefix="/metrics", tags=["metrics"])

_read = [Depends(require_permission(P.METRICS_READ))]


@router.get("/", response_model=MetricSamplesPublic, dependencies=_read)
def read_metrics(
    session: SessionDep,
    target_id: uuid.UUID | None = Query(default=None),
    metric: str | None = Query(default=None),
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
    skip: int = 0,
    limit: int = 200,
) -> Any:
    data, count = query_metric_samples(
        session,
        target_id=target_id,
        metric=metric,
        since=since,
        until=until,
        skip=skip,
        limit=limit,
    )
    return MetricSamplesPublic(data=data, count=count)
