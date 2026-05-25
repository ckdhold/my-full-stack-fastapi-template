#!/usr/bin/env python3
"""UMP Agent — collect host metrics and push to the monitoring platform."""

from __future__ import annotations

import os
import socket
import time
from datetime import datetime, timezone

import httpx
import psutil

API_URL = os.environ.get("UMP_API_URL", "http://localhost:6279/api/v1").rstrip("/")
API_TOKEN = os.environ.get("UMP_API_TOKEN", "")
HOST_ID = os.environ.get("UMP_HOST_ID", socket.gethostname())
AGENT_NAME = os.environ.get("UMP_AGENT_NAME", HOST_ID)
INTERVAL_SEC = int(os.environ.get("UMP_INTERVAL_SEC", "60"))
VERSION = "0.1.0"


def collect_metrics() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    return [
        {"metric": "host.cpu.usage_percent", "value": cpu, "ts": now},
        {"metric": "host.memory.usage_percent", "value": memory.percent, "ts": now},
        {"metric": "host.disk.usage_percent", "value": disk.percent, "ts": now},
        {"metric": "host.network.bytes_in", "value": float(net.bytes_recv), "ts": now},
        {"metric": "host.network.bytes_out", "value": float(net.bytes_sent), "ts": now},
    ]


def main() -> None:
    if not API_TOKEN:
        raise SystemExit("UMP_API_TOKEN is required")

    headers = {"X-Api-Token": API_TOKEN}
    with httpx.Client(base_url=API_URL, headers=headers, timeout=30.0) as client:
        print(f"UMP Agent starting: host_id={HOST_ID} api={API_URL}")
        while True:
            try:
                hb = client.post(
                    "/ingest/agent/heartbeat",
                    json={"version": VERSION},
                )
                hb.raise_for_status()
                payload = hb.json()
                print(f"heartbeat ok target_id={payload.get('target_id')}")

                metrics = collect_metrics()
                push = client.post("/ingest/metrics", json={"metrics": metrics})
                push.raise_for_status()
                print(f"pushed {len(metrics)} metrics")
            except httpx.HTTPError as exc:
                print(f"agent error: {exc}")
            time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()
