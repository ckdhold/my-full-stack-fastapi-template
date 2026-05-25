import logging
import threading
from collections.abc import Callable

from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.services.alerts import evaluate_all_rules
from app.services.monitoring import delete_old_metric_samples, mark_stale_agents_offline
from app.services.probe import run_all_probes

logger = logging.getLogger(__name__)

_threads: list[threading.Thread] = []
_stop_event = threading.Event()


def _run_periodic(
    name: str,
    interval_sec: int,
    fn: Callable[[Session], int | None],
) -> None:
    while not _stop_event.is_set():
        try:
            with Session(engine) as session:
                result = fn(session)
                if result is not None:
                    logger.debug("%s completed: %s", name, result)
        except Exception:
            logger.exception("Monitoring job failed: %s", name)
        _stop_event.wait(interval_sec)


def start_scheduler() -> None:
    global _threads, _stop_event
    if _threads:
        return
    _stop_event = threading.Event()

    jobs: list[tuple[str, int, Callable[[Session], int | None]]] = [
        ("probe_all_targets", settings.MONITOR_PROBE_INTERVAL_SEC, run_all_probes),
        (
            "evaluate_alert_rules",
            settings.MONITOR_PROBE_INTERVAL_SEC,
            evaluate_all_rules,
        ),
        (
            "agent_timeout_check",
            max(30, settings.MONITOR_AGENT_TIMEOUT_SEC // 2),
            lambda session: mark_stale_agents_offline(
                session, settings.MONITOR_AGENT_TIMEOUT_SEC
            ),
        ),
        (
            "metrics_retention_cleanup",
            86400,
            lambda session: delete_old_metric_samples(
                session, settings.MONITOR_METRICS_RETENTION_DAYS
            ),
        ),
    ]

    for name, interval, fn in jobs:
        thread = threading.Thread(
            target=_run_periodic,
            args=(name, interval, fn),
            name=f"monitor-{name}",
            daemon=True,
        )
        thread.start()
        _threads.append(thread)

    logger.info("Monitoring scheduler started with %s jobs", len(_threads))


def stop_scheduler() -> None:
    global _threads
    _stop_event.set()
    for thread in _threads:
        thread.join(timeout=2)
    _threads = []
    logger.info("Monitoring scheduler stopped")
