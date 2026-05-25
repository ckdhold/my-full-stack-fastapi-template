import socket
import time
from datetime import datetime, timezone

import httpx
from sqlmodel import Session, select

from app.models import MetricPoint, Target, TargetStatus, TargetType
from app.services.monitoring import insert_metric_samples


def _probe_http(target: Target) -> tuple[list[MetricPoint], str]:
    config = target.config_json or {}
    url = config.get("url")
    if not url or not isinstance(url, str):
        return [], TargetStatus.UNKNOWN

    method = str(config.get("method", "GET")).upper()
    expected_status = int(config.get("expected_status", 200))
    timeout_sec = float(config.get("timeout_sec", 10))

    started = time.perf_counter()
    try:
        with httpx.Client(timeout=timeout_sec, follow_redirects=True) as client:
            response = client.request(method, url)
        elapsed_ms = (time.perf_counter() - started) * 1000
        up = 1.0 if response.status_code == expected_status else 0.0
        status = TargetStatus.ONLINE if up else TargetStatus.OFFLINE
    except httpx.HTTPError:
        elapsed_ms = (time.perf_counter() - started) * 1000
        up = 0.0
        status = TargetStatus.OFFLINE

    now = datetime.now(timezone.utc)
    points = [
        MetricPoint(metric="probe.http.up", value=up, ts=now),
        MetricPoint(metric="probe.http.response_time_ms", value=elapsed_ms, ts=now),
    ]
    return points, status


def _probe_tcp(target: Target) -> tuple[list[MetricPoint], str]:
    config = target.config_json or {}
    host = config.get("host")
    port = config.get("port")
    if not host or port is None:
        return [], TargetStatus.UNKNOWN

    timeout_sec = float(config.get("timeout_sec", 5))
    started = time.perf_counter()
    up = 0.0
    status = TargetStatus.OFFLINE
    try:
        with socket.create_connection((str(host), int(port)), timeout=timeout_sec):
            up = 1.0
            status = TargetStatus.ONLINE
    except OSError:
        up = 0.0
        status = TargetStatus.OFFLINE
    elapsed_ms = (time.perf_counter() - started) * 1000
    now = datetime.now(timezone.utc)
    points = [
        MetricPoint(metric="probe.tcp.up", value=up, ts=now),
        MetricPoint(metric="probe.tcp.response_time_ms", value=elapsed_ms, ts=now),
    ]
    return points, status


def run_probe_for_target(session: Session, target: Target) -> None:
    if target.type == TargetType.HTTP:
        points, status = _probe_http(target)
    elif target.type == TargetType.TCP:
        points, status = _probe_tcp(target)
    else:
        return

    if not points:
        return

    insert_metric_samples(session, target_id=target.id, points=points)
    target.status = status
    target.updated_at = datetime.now(timezone.utc)
    session.add(target)
    session.commit()


def run_all_probes(session: Session) -> int:
    targets = session.exec(
        select(Target).where(Target.type.in_([TargetType.HTTP, TargetType.TCP]))  # type: ignore[attr-defined]
    ).all()
    for target in targets:
        run_probe_for_target(session, target)
    return len(targets)
