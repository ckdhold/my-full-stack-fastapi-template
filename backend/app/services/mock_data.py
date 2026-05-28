"""Idempotent demo / mock dataset for local development and UI testing."""

from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.models import (
    Agent,
    AgentStatus,
    Alert,
    AlertOperator,
    AlertRule,
    AlertSeverity,
    AlertStatus,
    ApiToken,
    AuditLog,
    Event,
    EventType,
    Item,
    ItemCreate,
    MetricSample,
    NotificationChannel,
    NotificationChannelType,
    NotificationLog,
    NotificationLogStatus,
    NotificationPolicy,
    Silence,
    Target,
    TargetStatus,
    TargetType,
    User,
    UserCreate,
)
from app.services.monitoring import generate_agent_token
from app.services.rbac import assign_role_to_user_by_name
from app.core import permission_codes as P

MOCK_MARKER_TARGET = "Mock-API-Gateway"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hours_ago(hours: float) -> datetime:
    return _now() - timedelta(hours=hours)


def _mock_already_seeded(session: Session) -> bool:
    return (
        session.exec(select(Target).where(Target.name == MOCK_MARKER_TARGET)).first()
        is not None
    )


def _add_metric_series(
    session: Session,
    *,
    target_id: uuid.UUID,
    metric: str,
    hours: int = 24,
    step_minutes: int = 15,
    base: float,
    amplitude: float,
    noise: float = 0.0,
    clamp: tuple[float, float] | None = None,
) -> int:
    points: list[MetricSample] = []
    steps = max(1, (hours * 60) // step_minutes)
    for i in range(steps + 1):
        ts = _now() - timedelta(minutes=step_minutes * (steps - i))
        wave = math.sin(i / 4) * amplitude
        value = base + wave + (random.uniform(-noise, noise) if noise else 0.0)
        if clamp:
            value = max(clamp[0], min(clamp[1], value))
        points.append(
            MetricSample(
                target_id=target_id,
                metric=metric,
                value=round(value, 4),
                labels={"source": "mock"},
                ts=ts,
            )
        )
    session.add_all(points)
    return len(points)


def seed_mock_data(session: Session) -> None:
    """Populate monitoring demo data once (skipped if marker target exists)."""
    if _mock_already_seeded(session):
        return

    now = _now()
    admin = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()

    # --- Users & items -------------------------------------------------------
    ops = crud.get_user_by_email(session=session, email="ops@example.com")
    if not ops:
        ops = crud.create_user(
            session=session,
            user_create=UserCreate(
                email="ops@example.com",
                password="changethis",
                full_name="运维工程师",
                is_active=True,
            ),
        )
    assign_role_to_user_by_name(session, ops.id, P.ROLE_USER)

    if admin:
        existing_items = session.exec(
            select(Item).where(Item.owner_id == admin.id)
        ).all()
        if len(existing_items) < 3:
            for title, desc in (
                ("内测检查清单", "W8 验收项跟踪"),
                ("Probe 配置模板", "HTTP/TCP 探测 JSON 示例"),
                ("值班交接记录", "告警 Ack 备注汇总"),
            ):
                if not session.exec(
                    select(Item).where(Item.title == title, Item.owner_id == admin.id)
                ).first():
                    crud.create_item(
                        session=session,
                        item_in=ItemCreate(title=title, description=desc),
                        owner_id=admin.id,
                    )

    # --- Targets -------------------------------------------------------------
    target_specs: list[dict] = [
        {
            "name": "Mock-API-Gateway",
            "type": TargetType.HTTP,
            "status": TargetStatus.ALERT,
            "labels": {"env": "prod", "team": "platform"},
            "config_json": {
                "url": "https://httpbin.org/status/200",
                "method": "GET",
                "expected_status": 200,
            },
            "description": "核心 API 网关（Mock）",
        },
        {
            "name": "Mock-Web-Frontend",
            "type": TargetType.HTTP,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "prod", "team": "frontend"},
            "config_json": {"url": "https://httpbin.org/get"},
            "description": "Web 前端入口",
        },
        {
            "name": "Mock-Auth-Service",
            "type": TargetType.HTTP,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "prod", "team": "identity"},
            "config_json": {"url": "https://httpbin.org/delay/1"},
            "description": "认证服务",
        },
        {
            "name": "Mock-Order-Service",
            "type": TargetType.HTTP,
            "status": TargetStatus.OFFLINE,
            "labels": {"env": "prod", "team": "trade"},
            "config_json": {"url": "https://httpbin.org/status/503"},
            "description": "订单服务（模拟离线）",
        },
        {
            "name": "Mock-Payment-API",
            "type": TargetType.HTTP,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "prod", "team": "pay"},
            "config_json": {"url": "https://httpbin.org/status/200"},
            "description": "支付 API",
        },
        {
            "name": "Mock-Redis",
            "type": TargetType.TCP,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "prod", "team": "infra"},
            "config_json": {"host": "127.0.0.1", "port": 6379},
            "description": "Redis 缓存",
        },
        {
            "name": "Mock-RabbitMQ",
            "type": TargetType.TCP,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "staging", "team": "infra"},
            "config_json": {"host": "127.0.0.1", "port": 5672},
            "description": "消息队列",
        },
        {
            "name": "Mock-PostgreSQL",
            "type": TargetType.DATABASE,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "prod", "team": "dba"},
            "config_json": {"host": "db", "port": 5432},
            "description": "主库 PostgreSQL",
        },
        {
            "name": "Mock-MySQL",
            "type": TargetType.DATABASE,
            "status": TargetStatus.ALERT,
            "labels": {"env": "prod", "team": "dba"},
            "config_json": {"host": "127.0.0.1", "port": 3306},
            "description": "MySQL 从库（模拟告警）",
        },
        {
            "name": "Mock-Biz-Orders",
            "type": TargetType.BUSINESS,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "prod", "team": "biz"},
            "config_json": {"endpoint": "/ingest/push/metrics"},
            "description": "订单业务指标 Push",
        },
        {
            "name": "Mock-Biz-Users",
            "type": TargetType.BUSINESS,
            "status": TargetStatus.ONLINE,
            "labels": {"env": "prod", "team": "biz"},
            "config_json": {},
            "description": "用户增长业务指标",
        },
    ]

    for i in range(1, 11):
        status = TargetStatus.ONLINE if i <= 8 else TargetStatus.OFFLINE
        target_specs.append(
            {
                "name": f"Mock-Host-{i:02d}",
                "type": TargetType.HOST,
                "status": status,
                "labels": {"env": "prod" if i <= 6 else "staging", "team": "ops"},
                "config_json": {"host_id": f"mock-host-{i:02d}"},
                "description": f"生产主机 {i:02d}",
            }
        )

    targets_by_name: dict[str, Target] = {}
    for spec in target_specs:
        target = Target(
            name=spec["name"],
            type=spec["type"],
            status=spec["status"],
            labels=spec["labels"],
            config_json=spec["config_json"],
            description=spec["description"],
            created_at=_hours_ago(72),
            updated_at=now,
        )
        session.add(target)
        session.commit()
        session.refresh(target)
        targets_by_name[target.name] = target

    # --- Agents (10 hosts) ---------------------------------------------------
    for i in range(1, 11):
        host_name = f"Mock-Host-{i:02d}"
        target = targets_by_name[host_name]
        plain, prefix, token_hash = generate_agent_token()
        online = i <= 8
        session.add(
            Agent(
                name=host_name,
                host_id=f"mock-host-{i:02d}",
                target_id=target.id,
                token_prefix=prefix,
                token_hash=token_hash,
                status=AgentStatus.ONLINE if online else AgentStatus.OFFLINE,
                version="0.2.0-mock",
                last_heartbeat_at=_hours_ago(0.05 if online else 3),
                created_at=_hours_ago(48),
            )
        )
    session.commit()

    # --- Metric samples ------------------------------------------------------
    for name, target in targets_by_name.items():
        if target.type == TargetType.HOST:
            _add_metric_series(
                session,
                target_id=target.id,
                metric="host.cpu.usage_pct",
                base=45,
                amplitude=25,
                noise=3,
                clamp=(5, 95),
            )
            _add_metric_series(
                session,
                target_id=target.id,
                metric="host.memory.usage_pct",
                base=60,
                amplitude=15,
                noise=2,
                clamp=(20, 90),
            )
            _add_metric_series(
                session,
                target_id=target.id,
                metric="host.disk.usage_pct",
                base=55,
                amplitude=5,
                noise=1,
                clamp=(30, 85),
            )
        elif target.type == TargetType.HTTP:
            up = 0.0 if target.status == TargetStatus.OFFLINE else 1.0
            _add_metric_series(
                session,
                target_id=target.id,
                metric="probe.http.up",
                base=up,
                amplitude=0,
                step_minutes=15,
            )
            latency_base = 120 if target.status == TargetStatus.ONLINE else 800
            _add_metric_series(
                session,
                target_id=target.id,
                metric="probe.http.response_time_ms",
                base=latency_base,
                amplitude=40,
                noise=15,
                clamp=(50, 2000),
            )
        elif target.type == TargetType.TCP:
            _add_metric_series(
                session,
                target_id=target.id,
                metric="probe.tcp.up",
                base=1.0,
                amplitude=0,
            )
            _add_metric_series(
                session,
                target_id=target.id,
                metric="probe.tcp.response_time_ms",
                base=8,
                amplitude=3,
                noise=1,
                clamp=(1, 50),
            )
        elif target.type == TargetType.DATABASE:
            up = 0.0 if target.status == TargetStatus.ALERT else 1.0
            _add_metric_series(
                session,
                target_id=target.id,
                metric="probe.db.up",
                base=up,
                amplitude=0,
            )
            _add_metric_series(
                session,
                target_id=target.id,
                metric="probe.db.response_time_ms",
                base=15 if up else 200,
                amplitude=5,
                noise=2,
            )
        elif target.type == TargetType.BUSINESS:
            _add_metric_series(
                session,
                target_id=target.id,
                metric="biz.orders.count",
                base=1200,
                amplitude=300,
                noise=50,
                clamp=(0, 5000),
            )
            _add_metric_series(
                session,
                target_id=target.id,
                metric="biz.error_rate",
                base=0.02,
                amplitude=0.01,
                noise=0.005,
                clamp=(0, 0.2),
            )

    session.commit()

    # --- Alert rules & alerts ------------------------------------------------
    api_gw = targets_by_name["Mock-API-Gateway"]
    mysql = targets_by_name["Mock-MySQL"]
    host1 = targets_by_name["Mock-Host-01"]
    order_svc = targets_by_name["Mock-Order-Service"]

    rules_spec = [
        {
            "name": "API 网关不可用",
            "target": api_gw,
            "metric": "probe.http.up",
            "operator": AlertOperator.LT,
            "threshold": 1.0,
            "severity": AlertSeverity.P0,
        },
        {
            "name": "MySQL 连接失败",
            "target": mysql,
            "metric": "probe.db.up",
            "operator": AlertOperator.LT,
            "threshold": 1.0,
            "severity": AlertSeverity.P1,
        },
        {
            "name": "主机 CPU 过高",
            "target": host1,
            "metric": "host.cpu.usage_pct",
            "operator": AlertOperator.GT,
            "threshold": 80.0,
            "duration_sec": 300,
            "severity": AlertSeverity.P2,
        },
        {
            "name": "订单服务响应慢",
            "target": order_svc,
            "metric": "probe.http.response_time_ms",
            "operator": AlertOperator.GT,
            "threshold": 500.0,
            "severity": AlertSeverity.P3,
            "enabled": False,
        },
    ]

    rules: list[AlertRule] = []
    for spec in rules_spec:
        rule = AlertRule(
            name=spec["name"],
            target_id=spec["target"].id,
            metric=spec["metric"],
            operator=spec["operator"],
            threshold=spec["threshold"],
            duration_sec=spec.get("duration_sec", 0),
            severity=spec["severity"],
            enabled=spec.get("enabled", True),
            created_at=_hours_ago(24),
            updated_at=now,
        )
        session.add(rule)
        session.commit()
        session.refresh(rule)
        rules.append(rule)

    alerts_spec = [
        {
            "rule": rules[0],
            "target": api_gw,
            "status": AlertStatus.FIRING,
            "message": "probe.http.up lt 1.0 (current: 0.0)",
            "value": 0.0,
            "fired_at": _hours_ago(0.5),
        },
        {
            "rule": rules[1],
            "target": mysql,
            "status": AlertStatus.ACKNOWLEDGED,
            "message": "probe.db.up lt 1.0 (current: 0.0)",
            "value": 0.0,
            "fired_at": _hours_ago(2),
            "ack_at": _hours_ago(1.5),
            "ack_note": "DBA 正在重启从库",
        },
        {
            "rule": rules[0],
            "target": api_gw,
            "status": AlertStatus.RESOLVED,
            "message": "probe.http.up recovered",
            "value": 1.0,
            "fired_at": _hours_ago(12),
            "resolved_at": _hours_ago(11),
        },
        {
            "rule": rules[1],
            "target": mysql,
            "status": AlertStatus.RESOLVED,
            "message": "MySQL connectivity restored",
            "value": 1.0,
            "fired_at": _hours_ago(48),
            "resolved_at": _hours_ago(47),
        },
    ]

    alerts: list[Alert] = []
    for spec in alerts_spec:
        alert = Alert(
            rule_id=spec["rule"].id,
            target_id=spec["target"].id,
            status=spec["status"],
            severity=spec["rule"].severity,
            message=spec["message"],
            current_value=spec["value"],
            fired_at=spec["fired_at"],
            acknowledged_at=spec.get("ack_at"),
            acknowledged_by=ops.id if spec.get("ack_at") and ops else None,
            ack_note=spec.get("ack_note"),
            resolved_at=spec.get("resolved_at"),
        )
        session.add(alert)
        session.commit()
        session.refresh(alert)
        alerts.append(alert)

    # --- Events --------------------------------------------------------------
    event_specs = [
        (EventType.TARGET_CREATED, "Target created: Mock-API-Gateway", api_gw.id, None, _hours_ago(72)),
        (EventType.ALERT_FIRED, alerts[0].message, api_gw.id, alerts[0].id, _hours_ago(0.5)),
        (EventType.ALERT_ACK, "Alert acknowledged: MySQL 连接失败", mysql.id, alerts[1].id, _hours_ago(1.5)),
        (EventType.ALERT_RESOLVED, "Alert resolved: probe.http.up recovered", api_gw.id, alerts[2].id, _hours_ago(11)),
        (EventType.AGENT_OFFLINE, "Agent Mock-Host-09 went offline", targets_by_name["Mock-Host-09"].id, None, _hours_ago(3)),
        (EventType.AGENT_OFFLINE, "Agent Mock-Host-10 went offline", targets_by_name["Mock-Host-10"].id, None, _hours_ago(2.5)),
        (EventType.AGENT_ONLINE, "Agent Mock-Host-01 is online", host1.id, None, _hours_ago(0.1)),
        (EventType.TARGET_UPDATED, "Target updated: Mock-Order-Service", order_svc.id, None, _hours_ago(6)),
    ]
    for etype, message, tid, aid, ts in event_specs:
        session.add(
            Event(
                type=etype,
                message=message,
                target_id=tid,
                alert_id=aid,
                meta_json={"source": "mock"},
                created_at=ts,
            )
        )
    session.commit()

    # --- Silences ------------------------------------------------------------
    session.add(
        Silence(
            target_id=targets_by_name["Mock-Redis"].id,
            reason="Redis 版本升级维护",
            starts_at=_hours_ago(1),
            ends_at=_now() + timedelta(hours=4),
            created_by=admin.id if admin else None,
            created_at=_hours_ago(1),
        )
    )
    session.add(
        Silence(
            target_id=None,
            reason="春节演练全局静默（已结束）",
            starts_at=_hours_ago(72),
            ends_at=_hours_ago(68),
            created_by=admin.id if admin else None,
            created_at=_hours_ago(72),
        )
    )
    session.commit()

    # --- API tokens (demo only, not usable without plain text) ---------------
    for name, target in (
        ("Push-Orders-Prod", targets_by_name["Mock-Biz-Orders"]),
        ("Push-Users-Prod", targets_by_name["Mock-Biz-Users"]),
    ):
        _, prefix, token_hash = generate_agent_token()
        session.add(
            ApiToken(
                name=name,
                target_id=target.id,
                token_prefix=prefix[:12],
                token_hash=token_hash,
                enabled=True,
                created_at=_hours_ago(24),
            )
        )
    session.commit()

    # --- Notification channel + logs -------------------------------------------
    dingtalk = session.exec(
        select(NotificationChannel).where(
            NotificationChannel.name == "Mock DingTalk"
        )
    ).first()
    if not dingtalk:
        dingtalk = NotificationChannel(
            name="Mock DingTalk",
            type=NotificationChannelType.DINGTALK,
            enabled=True,
            config_json={
                "webhook_url": "https://oapi.dingtalk.com/robot/send?access_token=mock",
            },
            created_at=_hours_ago(48),
            updated_at=now,
        )
        session.add(dingtalk)
        session.commit()
        session.refresh(dingtalk)
        session.add(
            NotificationPolicy(
                severity=AlertSeverity.P0,
                channel_id=dingtalk.id,
                enabled=True,
                created_at=_hours_ago(48),
            )
        )
        session.commit()

    email_channel = session.exec(
        select(NotificationChannel).where(
            NotificationChannel.name == "System email"
        )
    ).first()

    for i, alert in enumerate(alerts[:3]):
        channel = dingtalk if i == 0 else email_channel
        if not channel:
            continue
        session.add(
            NotificationLog(
                alert_id=alert.id,
                channel_id=channel.id,
                channel_type=channel.type,
                channel_name=channel.name,
                status=NotificationLogStatus.SUCCESS if i != 1 else NotificationLogStatus.FAILED,
                message=f"[{alert.severity.upper()}] {alert.message}",
                error="SMTP timeout (mock)" if i == 1 else None,
                created_at=alert.fired_at + timedelta(minutes=1),
            )
        )
    session.commit()

    # --- Audit logs ----------------------------------------------------------
    if admin:
        for action, rtype, rid, detail in (
            ("create", "target", str(api_gw.id), "Mock-API-Gateway"),
            ("create", "alert_rule", str(rules[0].id), rules[0].name),
            ("create", "silence", "mock", "Redis 版本升级维护"),
            ("create", "api_token", "mock", "Push-Orders-Prod"),
        ):
            session.add(
                AuditLog(
                    user_id=admin.id,
                    action=action,
                    resource_type=rtype,
                    resource_id=rid,
                    detail=detail,
                    created_at=_hours_ago(random.uniform(1, 48)),
                )
            )
        session.commit()
