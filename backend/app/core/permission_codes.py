"""Stable permission codes for RBAC (API + seed)."""

USERS_READ = "users:read"
USERS_WRITE = "users:write"
ITEMS_READ = "items:read"
ITEMS_WRITE = "items:write"
ROLES_MANAGE = "roles:manage"

DASHBOARD_READ = "dashboard:read"
TARGETS_READ = "targets:read"
TARGETS_WRITE = "targets:write"
METRICS_READ = "metrics:read"
AGENTS_READ = "agents:read"
AGENTS_MANAGE = "agents:manage"
ALERTS_READ = "alerts:read"
ALERTS_ACK = "alerts:ack"
ALERTS_MANAGE = "alerts:manage"
NOTIFICATIONS_READ = "notifications:read"
NOTIFICATIONS_MANAGE = "notifications:manage"

DEFAULT_PERMISSIONS: list[tuple[str, str]] = [
    (USERS_READ, "View users"),
    (USERS_WRITE, "Create and edit users"),
    (ITEMS_READ, "View items"),
    (ITEMS_WRITE, "Create and edit items"),
    (ROLES_MANAGE, "Manage roles and permissions"),
    (DASHBOARD_READ, "View monitoring dashboard"),
    (TARGETS_READ, "View monitoring targets"),
    (TARGETS_WRITE, "Create and edit monitoring targets"),
    (METRICS_READ, "View metrics"),
    (AGENTS_READ, "View monitoring agents"),
    (AGENTS_MANAGE, "Manage monitoring agents"),
    (ALERTS_READ, "View alerts"),
    (ALERTS_ACK, "Acknowledge alerts"),
    (ALERTS_MANAGE, "Manage alert rules"),
    (NOTIFICATIONS_READ, "View notification logs"),
    (NOTIFICATIONS_MANAGE, "Manage notification channels and policies"),
]

ROLE_ADMIN = "admin"
ROLE_USER = "user"
