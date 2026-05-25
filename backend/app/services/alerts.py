import logging
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from sqlmodel import Session, col, func, select

from app.models import (
    Alert,
    AlertOperator,
    AlertRule,
    AlertSeverity,
    AlertStatus,
    EventType,
    MetricSample,
    Target,
    TargetStatus,
)
from app.services.events import emit_event
from app.services.notifications import dispatch_alert
from app.services.silences import is_silenced

logger = logging.getLogger(__name__)

OPERATORS: dict[str, Callable[[float, float], bool]] = {
    AlertOperator.GT: lambda value, threshold: value > threshold,
    AlertOperator.GTE: lambda value, threshold: value >= threshold,
    AlertOperator.LT: lambda value, threshold: value < threshold,
    AlertOperator.LTE: lambda value, threshold: value <= threshold,
    AlertOperator.EQ: lambda value, threshold: value == threshold,
}

VALID_OPERATORS = set(OPERATORS)
VALID_SEVERITIES = {
    AlertSeverity.P0,
    AlertSeverity.P1,
    AlertSeverity.P2,
    AlertSeverity.P3,
}


def validate_operator(operator: str) -> None:
    if operator not in VALID_OPERATORS:
        raise ValueError(f"Invalid operator: {operator}")


def validate_severity(severity: str) -> None:
    if severity not in VALID_SEVERITIES:
        raise ValueError(f"Invalid severity: {severity}")


def _latest_sample(
    session: Session, target_id: uuid.UUID, metric: str
) -> MetricSample | None:
    return session.exec(
        select(MetricSample)
        .where(
            MetricSample.target_id == target_id,
            MetricSample.metric == metric,
        )
        .order_by(col(MetricSample.ts).desc())
        .limit(1)
    ).first()


def _active_alert(session: Session, rule_id: uuid.UUID) -> Alert | None:
    return session.exec(
        select(Alert).where(
            Alert.rule_id == rule_id,
            Alert.status.in_([AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED]),  # type: ignore[attr-defined]
        )
    ).first()


def _set_target_alert_status(session: Session, target_id: uuid.UUID) -> None:
    target = session.get(Target, target_id)
    if not target:
        return
    active = session.exec(
        select(func.count())
        .select_from(Alert)
        .where(
            Alert.target_id == target_id,
            Alert.status.in_([AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED]),  # type: ignore[attr-defined]
        )
    ).one()
    now = datetime.now(timezone.utc)
    if active > 0:
        target.status = TargetStatus.ALERT
    elif target.status == TargetStatus.ALERT:
        target.status = TargetStatus.UNKNOWN
    target.updated_at = now
    session.add(target)


def _notify_alert(session: Session, alert: Alert, rule: AlertRule, target: Target) -> None:
    dispatch_alert(session, alert, rule, target)


def _samples_since(
    session: Session,
    target_id: uuid.UUID,
    metric: str,
    since: datetime,
) -> list[MetricSample]:
    return list(
        session.exec(
            select(MetricSample)
            .where(
                MetricSample.target_id == target_id,
                MetricSample.metric == metric,
                col(MetricSample.ts) >= since,
            )
            .order_by(col(MetricSample.ts).asc())
        ).all()
    )


def _sustained_breach(
    session: Session,
    rule: AlertRule,
    op_fn: Callable[[float, float], bool],
) -> tuple[bool, float | None]:
    sample = _latest_sample(session, rule.target_id, rule.metric)
    if sample is None:
        return False, None

    duration = rule.duration_sec or 0
    if duration <= 0:
        return op_fn(sample.value, rule.threshold), sample.value

    since = datetime.now(timezone.utc).timestamp() - duration
    since_dt = datetime.fromtimestamp(since, tz=timezone.utc)
    samples = _samples_since(session, rule.target_id, rule.metric, since_dt)
    if not samples:
        return False, sample.value

    for item in samples:
        if not op_fn(item.value, rule.threshold):
            return False, sample.value
    return True, sample.value


def _fire_alert(
    session: Session,
    rule: AlertRule,
    target: Target,
    *,
    message: str,
    current_value: float | None,
) -> Alert | None:
    if is_silenced(session, target.id):
        logger.info("Skipping alert for silenced target %s", target.id)
        return None

    alert = Alert(
        rule_id=rule.id,
        target_id=target.id,
        status=AlertStatus.FIRING,
        severity=rule.severity,
        message=message,
        current_value=current_value,
    )
    session.add(alert)
    session.commit()
    session.refresh(alert)
    _set_target_alert_status(session, target.id)
    session.commit()
    _notify_alert(session, alert, rule, target)
    emit_event(
        session,
        type=EventType.ALERT_FIRED,
        message=message,
        target_id=target.id,
        alert_id=alert.id,
        meta_json={"severity": rule.severity, "rule_id": str(rule.id)},
    )
    return alert


def _resolve_alert(session: Session, alert: Alert) -> None:
    now = datetime.now(timezone.utc)
    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = now
    session.add(alert)
    session.commit()
    _set_target_alert_status(session, alert.target_id)
    emit_event(
        session,
        type=EventType.ALERT_RESOLVED,
        message=f"Alert resolved: {alert.message}",
        target_id=alert.target_id,
        alert_id=alert.id,
    )


def evaluate_rule(session: Session, rule: AlertRule) -> None:
    if not rule.enabled:
        return

    target = session.get(Target, rule.target_id)
    if not target:
        return

    sample = _latest_sample(session, rule.target_id, rule.metric)
    active = _active_alert(session, rule.id)

    if sample is None:
        if rule.no_data_sec and rule.no_data_sec > 0:
            if active:
                return
            message = f"No data for metric {rule.metric} on {target.name}"
            _fire_alert(session, rule, target, message=message, current_value=None)
        return

    now = datetime.now(timezone.utc)
    if rule.no_data_sec and (now - sample.ts).total_seconds() > rule.no_data_sec:
        if not active:
            message = (
                f"No recent data for {rule.metric} on {target.name} "
                f"(>{rule.no_data_sec}s)"
            )
            _fire_alert(session, rule, target, message=message, current_value=None)
        return

    op_fn = OPERATORS.get(rule.operator)
    if not op_fn:
        return

    breached, current_value = _sustained_breach(session, rule, op_fn)
    if breached:
        if active:
            if current_value is not None:
                active.current_value = current_value
            active.message = (
                f"{rule.metric} {rule.operator} {rule.threshold} "
                f"(current: {current_value})"
            )
            session.add(active)
            session.commit()
            return
        message = (
            f"{rule.metric} {rule.operator} {rule.threshold} "
            f"(current: {current_value})"
        )
        _fire_alert(
            session,
            rule,
            target,
            message=message,
            current_value=current_value,
        )
        return

    if active:
        _resolve_alert(session, active)


def evaluate_all_rules(session: Session) -> int:
    rules = session.exec(select(AlertRule).where(AlertRule.enabled == True)).all()  # noqa: E712
    for rule in rules:
        try:
            evaluate_rule(session, rule)
        except Exception:
            logger.exception("Failed to evaluate alert rule %s", rule.id)
    return len(rules)


def alert_to_public(session: Session, alert: Alert) -> dict:
    rule = session.get(AlertRule, alert.rule_id)
    target = session.get(Target, alert.target_id)
    data = alert.model_dump()
    data["rule_name"] = rule.name if rule else None
    data["target_name"] = target.name if target else None
    return data


def get_alert_summary(session: Session) -> dict[str, int]:
    firing = session.exec(
        select(func.count())
        .select_from(Alert)
        .where(Alert.status == AlertStatus.FIRING)
    ).one()
    acknowledged = session.exec(
        select(func.count())
        .select_from(Alert)
        .where(Alert.status == AlertStatus.ACKNOWLEDGED)
    ).one()
    resolved = session.exec(
        select(func.count())
        .select_from(Alert)
        .where(Alert.status == AlertStatus.RESOLVED)
    ).one()
    return {
        "firing": firing,
        "acknowledged": acknowledged,
        "resolved": resolved,
    }


def acknowledge_alert(
    session: Session,
    alert_id: uuid.UUID,
    user_id: uuid.UUID,
    note: str | None = None,
) -> Alert | None:
    alert = session.get(Alert, alert_id)
    if not alert or alert.status != AlertStatus.FIRING:
        return None
    now = datetime.now(timezone.utc)
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_at = now
    alert.acknowledged_by = user_id
    alert.ack_note = note
    session.add(alert)
    session.commit()
    session.refresh(alert)
    emit_event(
        session,
        type=EventType.ALERT_ACK,
        message=f"Alert acknowledged: {alert.message}",
        target_id=alert.target_id,
        alert_id=alert.id,
        meta_json={"note": note} if note else {},
    )
    return alert
