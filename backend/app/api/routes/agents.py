import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import require_permission
from app.api.deps import SessionDep
from app.core import permission_codes as P
from app.models import (
    AgentCreate,
    AgentCreatedPublic,
    AgentPublic,
    AgentsPublic,
    Message,
)
from app.services.monitoring import create_agent

router = APIRouter(prefix="/agents", tags=["agents"])

_read = [Depends(require_permission(P.AGENTS_READ))]
_manage = [Depends(require_permission(P.AGENTS_MANAGE))]


@router.get("/", response_model=AgentsPublic, dependencies=_read)
def read_agents(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    from app.models import Agent

    count = session.exec(select(func.count()).select_from(Agent)).one()
    agents = session.exec(
        select(Agent).order_by(col(Agent.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return AgentsPublic(
        data=[AgentPublic.model_validate(a) for a in agents],
        count=count,
    )


@router.post("/", response_model=AgentCreatedPublic, dependencies=_manage)
def create_agent_route(session: SessionDep, agent_in: AgentCreate) -> Any:
    try:
        agent, token = create_agent(session, agent_in)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return AgentCreatedPublic(agent=AgentPublic.model_validate(agent), token=token)


@router.delete("/{id}", dependencies=_manage)
def delete_agent(session: SessionDep, id: uuid.UUID) -> Message:
    from app.models import Agent

    agent = session.get(Agent, id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session.delete(agent)
    session.commit()
    return Message(message="Agent deleted successfully")
