import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, require_permission, SessionDep
from app.core import permission_codes as P
from app.models import (
    Alert,
    AlertAck,
    AlertPublic,
    AlertRule,
    AlertRuleCreate,
    AlertRulePublic,
    AlertRulesPublic,
    AlertRuleUpdate,
    AlertsPublic,
    AlertStatus,
    AlertSummary,
    Message,
)
from app.services.alerts import (
    alert_to_public,
    acknowledge_alert,
    get_alert_summary,
    validate_operator,
    validate_severity,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])

_read = [Depends(require_permission(P.ALERTS_READ))]
_ack = [Depends(require_permission(P.ALERTS_ACK))]
_manage = [Depends(require_permission(P.ALERTS_MANAGE))]


@router.get("/summary", response_model=AlertSummary, dependencies=_read)
def read_alerts_summary(session: SessionDep) -> Any:
    return AlertSummary(**get_alert_summary(session))


@router.get("/", response_model=AlertsPublic, dependencies=_read)
def read_alerts(
    session: SessionDep,
    status: str | None = Query(default=None),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    statement = select(Alert)
    count_statement = select(func.count()).select_from(Alert)
    if status:
        statement = statement.where(Alert.status == status)
        count_statement = count_statement.where(Alert.status == status)
    count = session.exec(count_statement).one()
    alerts = session.exec(
        statement.order_by(col(Alert.fired_at).desc()).offset(skip).limit(limit)
    ).all()
    return AlertsPublic(
        data=[AlertPublic.model_validate(alert_to_public(session, a)) for a in alerts],
        count=count,
    )


@router.post("/{id}/ack", response_model=AlertPublic, dependencies=_ack)
def ack_alert(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    body: AlertAck,
) -> Any:
    alert = acknowledge_alert(session, id, current_user.id, body.note)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found or not firing")
    return AlertPublic.model_validate(alert_to_public(session, alert))


@router.get("/rules/", response_model=AlertRulesPublic, dependencies=_read)
def read_alert_rules(
    session: SessionDep, skip: int = 0, limit: int = 100
) -> Any:
    count = session.exec(select(func.count()).select_from(AlertRule)).one()
    rules = session.exec(
        select(AlertRule).order_by(col(AlertRule.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return AlertRulesPublic(
        data=[AlertRulePublic.model_validate(r) for r in rules],
        count=count,
    )


@router.post("/rules/", response_model=AlertRulePublic, dependencies=_manage)
def create_alert_rule(session: SessionDep, rule_in: AlertRuleCreate) -> Any:
    validate_operator(rule_in.operator)
    validate_severity(rule_in.severity)
    rule = AlertRule.model_validate(rule_in)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.put("/rules/{id}", response_model=AlertRulePublic, dependencies=_manage)
def update_alert_rule(
    session: SessionDep, id: uuid.UUID, rule_in: AlertRuleUpdate
) -> Any:
    rule = session.get(AlertRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    data = rule_in.model_dump(exclude_unset=True)
    if "operator" in data and data["operator"] is not None:
        validate_operator(data["operator"])
    if "severity" in data and data["severity"] is not None:
        validate_severity(data["severity"])
    data["updated_at"] = datetime.now(timezone.utc)
    rule.sqlmodel_update(data)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.delete("/rules/{id}", dependencies=_manage)
def delete_alert_rule(session: SessionDep, id: uuid.UUID) -> Message:
    rule = session.get(AlertRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    session.delete(rule)
    session.commit()
    return Message(message="Alert rule deleted successfully")
