from sqlmodel import Session, select

from app.models import Dashboard


PRESET_DASHBOARDS: list[dict] = [
    {
        "slug": "overview",
        "title_zh": "平台总览",
        "title_en": "Platform overview",
        "description_zh": "目标与探测可用性概览",
        "description_en": "Target and probe availability overview",
        "sort_order": 0,
        "panels_json": [
            {
                "id": "http-up",
                "title_zh": "HTTP 可用性",
                "title_en": "HTTP availability",
                "metric": "probe.http.up",
                "target_type": "http",
                "chart": "line",
            },
            {
                "id": "tcp-up",
                "title_zh": "TCP 可用性",
                "title_en": "TCP availability",
                "metric": "probe.tcp.up",
                "target_type": "tcp",
                "chart": "line",
            },
            {
                "id": "db-up",
                "title_zh": "数据库连通性",
                "title_en": "Database connectivity",
                "metric": "probe.db.up",
                "target_type": "database",
                "chart": "line",
            },
        ],
    },
    {
        "slug": "latency",
        "title_zh": "响应延迟",
        "title_en": "Response latency",
        "description_zh": "HTTP/TCP 探测响应时间",
        "description_en": "HTTP/TCP probe response times",
        "sort_order": 10,
        "panels_json": [
            {
                "id": "http-latency",
                "title_zh": "HTTP 响应时间",
                "title_en": "HTTP response time",
                "metric": "probe.http.response_time_ms",
                "target_type": "http",
                "chart": "line",
            },
            {
                "id": "tcp-latency",
                "title_zh": "TCP 连接时间",
                "title_en": "TCP connect time",
                "metric": "probe.tcp.response_time_ms",
                "target_type": "tcp",
                "chart": "line",
            },
        ],
    },
    {
        "slug": "hosts",
        "title_zh": "主机资源",
        "title_en": "Host resources",
        "description_zh": "Agent 上报的主机指标",
        "description_en": "Host metrics from agents",
        "sort_order": 20,
        "panels_json": [
            {
                "id": "cpu",
                "title_zh": "CPU 使用率",
                "title_en": "CPU usage",
                "metric": "host.cpu.usage_pct",
                "target_type": "host",
                "chart": "line",
            },
            {
                "id": "mem",
                "title_zh": "内存使用率",
                "title_en": "Memory usage",
                "metric": "host.memory.usage_pct",
                "target_type": "host",
                "chart": "line",
            },
        ],
    },
]


def seed_dashboards(session: Session) -> None:
    for preset in PRESET_DASHBOARDS:
        existing = session.exec(
            select(Dashboard).where(Dashboard.slug == preset["slug"])
        ).first()
        if existing:
            changed = False
            for key in (
                "title_zh",
                "title_en",
                "description_zh",
                "description_en",
                "panels_json",
                "sort_order",
            ):
                if getattr(existing, key) != preset[key]:
                    setattr(existing, key, preset[key])
                    changed = True
            if changed:
                session.add(existing)
                session.commit()
            continue
        session.add(Dashboard(**preset))
        session.commit()


def list_dashboards(session: Session) -> list[Dashboard]:
    return list(
        session.exec(select(Dashboard).order_by(Dashboard.sort_order)).all()
    )


def get_dashboard_by_slug(session: Session, slug: str) -> Dashboard | None:
    return session.exec(select(Dashboard).where(Dashboard.slug == slug)).first()
