"""Stable permission codes for RBAC (API + seed)."""

USERS_READ = "users:read"
USERS_WRITE = "users:write"
ITEMS_READ = "items:read"
ITEMS_WRITE = "items:write"
ROLES_MANAGE = "roles:manage"

DEFAULT_PERMISSIONS: list[tuple[str, str]] = [
    (USERS_READ, "View users"),
    (USERS_WRITE, "Create and edit users"),
    (ITEMS_READ, "View items"),
    (ITEMS_WRITE, "Create and edit items"),
    (ROLES_MANAGE, "Manage roles and permissions"),
]

ROLE_ADMIN = "admin"
ROLE_USER = "user"
