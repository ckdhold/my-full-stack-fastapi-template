from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import AgentDep, ApiTokenDep, SessionDep
from app.models import Message, MetricsPush
from app.services.monitoring import ensure_host_target, insert_metric_samples, record_heartbeat

router = APIRouter(prefix="/ingest", tags=["ingest"])


class AgentHeartbeat(BaseModel):
    version: str | None = None


@router.post("/agent/heartbeat")
def agent_heartbeat(
    session: SessionDep, agent: AgentDep, body: AgentHeartbeat | None = None
) -> dict:
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
def push_agent_metrics(session: SessionDep, agent: AgentDep, body: MetricsPush) -> Message:
    target = ensure_host_target(session, agent)
    count = insert_metric_samples(session, target_id=target.id, points=body.metrics)
    record_heartbeat(session, agent)
    return Message(message=f"Accepted {count} metric samples")


@router.post("/push/metrics")
def push_business_metrics(
    session: SessionDep, api_token: ApiTokenDep, body: MetricsPush
) -> Message:
    count = insert_metric_samples(
        session, target_id=api_token.target_id, points=body.metrics
    )
    return Message(message=f"Accepted {count} metric samples")
