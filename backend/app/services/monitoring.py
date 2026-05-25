import secrets
import uuid
from datetime import datetime, timezone

from sqlmodel import Session, col, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Agent,
    AgentCreate,
    AgentPublic,
    AgentStatus,
    EventType,
    MetricPoint,
    MetricSample,
    MetricSamplePublic,
    Target,
    TargetStatus,
    TargetType,
)
from app.services.events import emit_event


def generate_agent_token() -> tuple[str, str, str]:
    plain = secrets.token_urlsafe(32)
    return plain, plain[:8], get_password_hash(plain)


def find_agent_by_token(session: Session, token: str) -> Agent | None:
    if len(token) < 8:
        return None
    prefix = token[:8]
    candidates = session.exec(
        select(Agent).where(Agent.token_prefix == prefix)
    ).all()
    for agent in candidates:
        ok, _ = verify_password(token, agent.token_hash)
        if ok:
            return agent
    return None


def create_agent(session: Session, agent_in: AgentCreate) -> tuple[Agent, str]:
    existing = session.exec(
        select(Agent).where(Agent.host_id == agent_in.host_id)
    ).first()
    if existing:
        raise ValueError("Agent with this host_id already exists")

    plain, prefix, token_hash = generate_agent_token()
    agent = Agent.model_validate(
        agent_in,
        update={"token_prefix": prefix, "token_hash": token_hash},
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent, plain


def ensure_host_target(session: Session, agent: Agent) -> Target:
    if agent.target_id:
        target = session.get(Target, agent.target_id)
        if target:
            return target

    target = session.exec(
        select(Target).where(
            Target.type == TargetType.HOST,
            Target.name == agent.name,
        )
    ).first()
    if not target:
        target = Target(
            name=agent.name,
            type=TargetType.HOST,
            status=TargetStatus.UNKNOWN,
            labels={"host_id": agent.host_id},
            config_json={"host_id": agent.host_id},
            description=f"Auto-created for agent {agent.host_id}",
        )
        session.add(target)
        session.commit()
        session.refresh(target)

    agent.target_id = target.id
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return target


def record_heartbeat(session: Session, agent: Agent, version: str | None = None) -> Agent:
    now = datetime.now(timezone.utc)
    agent.last_heartbeat_at = now
    was_offline = agent.status == AgentStatus.OFFLINE
    agent.status = AgentStatus.ONLINE
    if version:
        agent.version = version
    ensure_host_target(session, agent)
    if agent.target_id:
        target = session.get(Target, agent.target_id)
        if target and target.status != TargetStatus.ALERT:
            target.status = TargetStatus.ONLINE
            target.updated_at = now
            session.add(target)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    if was_offline:
        emit_event(
            session,
            type=EventType.AGENT_ONLINE,
            message=f"Agent {agent.name} is online",
            target_id=agent.target_id,
            meta_json={"host_id": agent.host_id},
        )
    return agent


def insert_metric_samples(
    session: Session,
    *,
    target_id: uuid.UUID,
    points: list[MetricPoint],
) -> int:
    now = datetime.now(timezone.utc)
    count = 0
    for point in points:
        sample = MetricSample(
            target_id=target_id,
            metric=point.metric,
            value=point.value,
            labels=point.labels,
            ts=point.ts or now,
        )
        session.add(sample)
        count += 1
    session.commit()
    return count


def query_metric_samples(
    session: Session,
    *,
    target_id: uuid.UUID | None = None,
    metric: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    skip: int = 0,
    limit: int = 200,
) -> tuple[list[MetricSamplePublic], int]:
    statement = select(MetricSample)
    count_statement = select(func.count()).select_from(MetricSample)

    if target_id:
        statement = statement.where(MetricSample.target_id == target_id)
        count_statement = count_statement.where(MetricSample.target_id == target_id)
    if metric:
        statement = statement.where(MetricSample.metric == metric)
        count_statement = count_statement.where(MetricSample.metric == metric)
    if since:
        statement = statement.where(col(MetricSample.ts) >= since)
        count_statement = count_statement.where(col(MetricSample.ts) >= since)
    if until:
        statement = statement.where(col(MetricSample.ts) <= until)
        count_statement = count_statement.where(col(MetricSample.ts) <= until)

    count = session.exec(count_statement).one()
    rows = session.exec(
        statement.order_by(col(MetricSample.ts).desc()).offset(skip).limit(limit)
    ).all()
    return [MetricSamplePublic.model_validate(r) for r in rows], count


def mark_stale_agents_offline(session: Session, timeout_sec: int) -> int:
    now = datetime.now(timezone.utc)
    cutoff = now.timestamp() - timeout_sec
    agents = session.exec(
        select(Agent).where(Agent.status == AgentStatus.ONLINE)
    ).all()
    updated = 0
    for agent in agents:
        if not agent.last_heartbeat_at:
            continue
        if agent.last_heartbeat_at.timestamp() < cutoff:
            agent.status = AgentStatus.OFFLINE
            session.add(agent)
            if agent.target_id:
                target = session.get(Target, agent.target_id)
                if target and target.status == TargetStatus.ONLINE:
                    target.status = TargetStatus.OFFLINE
                    target.updated_at = now
                    session.add(target)
                emit_event(
                    session,
                    type=EventType.AGENT_OFFLINE,
                    message=f"Agent {agent.name} went offline",
                    target_id=agent.target_id,
                    meta_json={"host_id": agent.host_id},
                )
            updated += 1
    if updated:
        session.commit()
    return updated


def delete_old_metric_samples(session: Session, retention_days: int) -> int:
    cutoff = datetime.now(timezone.utc).timestamp() - retention_days * 86400
    cutoff_dt = datetime.fromtimestamp(cutoff, tz=timezone.utc)
    rows = session.exec(
        select(MetricSample).where(col(MetricSample.ts) < cutoff_dt)
    ).all()
    for row in rows:
        session.delete(row)
    if rows:
        session.commit()
    return len(rows)
