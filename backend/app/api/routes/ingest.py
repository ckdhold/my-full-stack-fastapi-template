from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import AgentDep, SessionDep
from app.models import Message, MetricsPush
from app.services.monitoring import ensure_host_target, insert_metric_samples, record_heartbeat

router = APIRouter(prefix="/ingest", tags=["ingest"])


class AgentHeartbeat(BaseModel):
    version: str | None = None


@router.post("/agent/heartbeat")
def agent_heartbeat(
    session: SessionDep, agent: AgentDep, body: AgentHeartbeat | None = None
) -> Any:
    version = body.version if body else None
    updated = record_heartbeat(session, agent, version=version)
    target = ensure_host_target(session, updated)
    return {
        "message": "ok",
        "agent_id": str(updated.id),
        "target_id": str(target.id),
        "status": updated.status,
    }


@router.post("/metrics")
def push_metrics(session: SessionDep, agent: AgentDep, body: MetricsPush) -> Any:
    target = ensure_host_target(session, agent)
    count = insert_metric_samples(session, target_id=target.id, points=body.metrics)
    record_heartbeat(session, agent)
    return Message(message=f"Accepted {count} metric samples")
