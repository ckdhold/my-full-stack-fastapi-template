import logging
import uuid

from sqlmodel import Session, col, select

from app.core.config import settings
from app.models import (
    Alert,
    AlertRule,
    AlertSeverity,
    NotificationChannel,
    NotificationChannelType,
    NotificationLog,
    NotificationLogStatus,
    NotificationPolicy,
    Target,
    User,
)
from app.services.dingtalk import send_dingtalk_markdown
from app.utils import send_email

logger = logging.getLogger(__name__)

VALID_CHANNEL_TYPES = {
    NotificationChannelType.EMAIL,
    NotificationChannelType.DINGTALK,
}
VALID_SEVERITIES = {
    AlertSeverity.P0,
    AlertSeverity.P1,
    AlertSeverity.P2,
    AlertSeverity.P3,
}


def validate_channel_type(channel_type: str) -> None:
    if channel_type not in VALID_CHANNEL_TYPES:
        raise ValueError(f"Invalid channel type: {channel_type}")


def validate_severity(severity: str) -> None:
    if severity not in VALID_SEVERITIES:
        raise ValueError(f"Invalid severity: {severity}")


def _alert_subject(alert: Alert, rule: AlertRule, target: Target) -> str:
    return f"[{alert.severity.upper()}] {rule.name} — {target.name}"


def _alert_markdown(alert: Alert, rule: AlertRule, target: Target) -> str:
    value = alert.current_value if alert.current_value is not None else "N/A"
    link = f"{settings.FRONTEND_HOST}/alerts/active"
    return (
        f"### 监控告警\n\n"
        f"- **级别**: {alert.severity.upper()}\n"
        f"- **规则**: {rule.name}\n"
        f"- **目标**: {target.name}\n"
        f"- **指标**: {rule.metric}\n"
        f"- **当前值**: {value}\n"
        f"- **阈值**: {rule.operator} {rule.threshold}\n"
        f"- **详情**: {alert.message}\n\n"
        f"[查看告警]({link})"
    )


def _alert_email_html(alert: Alert, rule: AlertRule, target: Target) -> str:
    value = alert.current_value if alert.current_value is not None else "N/A"
    return f"""
    <h2>Monitoring alert fired</h2>
    <p><strong>Rule:</strong> {rule.name}</p>
    <p><strong>Target:</strong> {target.name}</p>
    <p><strong>Metric:</strong> {rule.metric}</p>
    <p><strong>Value:</strong> {value}</p>
    <p><strong>Threshold:</strong> {rule.operator} {rule.threshold}</p>
    <p><strong>Message:</strong> {alert.message}</p>
    <p><a href="{settings.FRONTEND_HOST}/alerts/active">View alerts</a></p>
    """


def _write_log(
    session: Session,
    *,
    alert_id: uuid.UUID | None,
    channel: NotificationChannel | None,
    channel_type: str,
    channel_name: str,
    status: str,
    message: str,
    error: str | None = None,
) -> None:
    log = NotificationLog(
        alert_id=alert_id,
        channel_id=channel.id if channel else None,
        channel_type=channel_type,
        channel_name=channel_name,
        status=status,
        message=message[:500],
        error=error[:500] if error else None,
    )
    session.add(log)
    session.commit()


def _send_email_channel(
    session: Session,
    channel: NotificationChannel,
    alert: Alert,
    rule: AlertRule,
    target: Target,
) -> None:
    if not settings.emails_enabled:
        raise RuntimeError("Email is not configured")
    superusers = session.exec(select(User).where(User.is_superuser == True)).all()  # noqa: E712
    if not superusers:
        raise RuntimeError("No superuser recipients")
    subject = _alert_subject(alert, rule, target)
    html = _alert_email_html(alert, rule, target)
    for user in superusers:
        send_email(email_to=user.email, subject=subject, html_content=html)


def _send_dingtalk_channel(
    channel: NotificationChannel,
    alert: Alert,
    rule: AlertRule,
    target: Target,
) -> None:
    config = channel.config_json or {}
    webhook_url = config.get("webhook_url")
    if not webhook_url or not isinstance(webhook_url, str):
        raise RuntimeError("DingTalk webhook_url is required")
    secret = config.get("secret")
    secret_str = secret if isinstance(secret, str) and secret else None
    send_dingtalk_markdown(
        webhook_url=webhook_url,
        secret=secret_str,
        title=_alert_subject(alert, rule, target),
        text=_alert_markdown(alert, rule, target),
    )


def send_test_notification(session: Session, channel: NotificationChannel) -> None:
    fake_alert = Alert(
        rule_id=uuid.uuid4(),
        target_id=uuid.uuid4(),
        status="firing",
        severity=AlertSeverity.P2,
        message="Test notification from monitoring platform",
        current_value=0.0,
    )
    fake_rule = AlertRule(
        id=uuid.uuid4(),
        name="Test rule",
        target_id=fake_alert.target_id,
        metric="test.metric",
        operator="lt",
        threshold=1,
        severity=AlertSeverity.P2,
    )
    fake_target = Target(
        id=fake_alert.target_id,
        name="Test target",
        type="http",
        status="online",
    )
    if channel.type == NotificationChannelType.EMAIL:
        _send_email_channel(session, channel, fake_alert, fake_rule, fake_target)
        return
    if channel.type == NotificationChannelType.DINGTALK:
        _send_dingtalk_channel(channel, fake_alert, fake_rule, fake_target)
        return
    raise ValueError(f"Unsupported channel type: {channel.type}")


def dispatch_alert(
    session: Session,
    alert: Alert,
    rule: AlertRule,
    target: Target,
) -> None:
    policies = session.exec(
        select(NotificationPolicy)
        .join(NotificationChannel, NotificationChannel.id == NotificationPolicy.channel_id)
        .where(
            NotificationPolicy.severity == alert.severity,
            NotificationPolicy.enabled == True,  # noqa: E712
            NotificationChannel.enabled == True,  # noqa: E712
        )
        .order_by(col(NotificationPolicy.created_at))
    ).all()

    if not policies:
        _dispatch_fallback_email(session, alert, rule, target)
        return

    subject = _alert_subject(alert, rule, target)
    for policy in policies:
        channel = session.get(NotificationChannel, policy.channel_id)
        if not channel or not channel.enabled:
            continue
        try:
            if channel.type == NotificationChannelType.EMAIL:
                _send_email_channel(session, channel, alert, rule, target)
            elif channel.type == NotificationChannelType.DINGTALK:
                _send_dingtalk_channel(channel, alert, rule, target)
            else:
                raise RuntimeError(f"Unsupported channel type: {channel.type}")
            _write_log(
                session,
                alert_id=alert.id,
                channel=channel,
                channel_type=channel.type,
                channel_name=channel.name,
                status=NotificationLogStatus.SUCCESS,
                message=subject,
            )
        except Exception as exc:
            logger.exception("Failed to send alert via channel %s", channel.id)
            _write_log(
                session,
                alert_id=alert.id,
                channel=channel,
                channel_type=channel.type,
                channel_name=channel.name,
                status=NotificationLogStatus.FAILED,
                message=subject,
                error=str(exc),
            )


def _dispatch_fallback_email(
    session: Session,
    alert: Alert,
    rule: AlertRule,
    target: Target,
) -> None:
    if not settings.emails_enabled:
        return
    subject = _alert_subject(alert, rule, target)
    try:
        fake_channel = NotificationChannel(
            name="System email",
            type=NotificationChannelType.EMAIL,
            enabled=True,
        )
        _send_email_channel(session, fake_channel, alert, rule, target)
        _write_log(
            session,
            alert_id=alert.id,
            channel=None,
            channel_type=NotificationChannelType.EMAIL,
            channel_name="System email",
            status=NotificationLogStatus.SUCCESS,
            message=subject,
        )
    except Exception as exc:
        logger.exception("Fallback email notification failed")
        _write_log(
            session,
            alert_id=alert.id,
            channel=None,
            channel_type=NotificationChannelType.EMAIL,
            channel_name="System email",
            status=NotificationLogStatus.FAILED,
            message=subject,
            error=str(exc),
        )


def policy_to_public(session: Session, policy: NotificationPolicy) -> dict:
    channel = session.get(NotificationChannel, policy.channel_id)
    data = policy.model_dump()
    data["channel_name"] = channel.name if channel else None
    data["channel_type"] = channel.type if channel else None
    return data


def seed_notifications(session: Session) -> None:
    """Idempotent: default email channel and baseline policies."""
    email_channel = session.exec(
        select(NotificationChannel).where(
            NotificationChannel.type == NotificationChannelType.EMAIL,
            NotificationChannel.name == "System email",
        )
    ).first()
    if not email_channel:
        email_channel = NotificationChannel(
            name="System email",
            type=NotificationChannelType.EMAIL,
            enabled=True,
            config_json={},
        )
        session.add(email_channel)
        session.commit()
        session.refresh(email_channel)

    for severity in (AlertSeverity.P0, AlertSeverity.P2):
        existing = session.exec(
            select(NotificationPolicy).where(
                NotificationPolicy.severity == severity,
                NotificationPolicy.channel_id == email_channel.id,
            )
        ).first()
        if not existing:
            session.add(
                NotificationPolicy(
                    severity=severity,
                    channel_id=email_channel.id,
                    enabled=True,
                )
            )
    session.commit()
