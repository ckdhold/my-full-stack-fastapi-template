"""Replace menu title_key with title_zh and title_en

Revision ID: a3b4c5d6e7f8
Revises: f3a91c2b8d44
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa

revision = "a3b4c5d6e7f8"
down_revision = "f3a91c2b8d44"
branch_labels = None
depends_on = None

TITLE_KEY_MAP: dict[str, tuple[str, str]] = {
    "nav.dashboard": ("工作台", "Dashboard"),
    "nav.targets": ("监控目标", "Targets"),
    "nav.metrics": ("指标查询", "Metrics"),
    "nav.alertsActive": ("活跃告警", "Active alerts"),
    "nav.alertRules": ("告警规则", "Alert rules"),
    "nav.alertHistory": ("告警历史", "Alert history"),
    "nav.notifications": ("通知中心", "Notifications"),
    "nav.notificationChannels": ("通知渠道", "Channels"),
    "nav.notificationPolicies": ("通知策略", "Policies"),
    "nav.notificationLogs": ("通知记录", "Logs"),
    "nav.items": ("条目", "Items"),
    "nav.settings": ("设置", "Settings"),
    "nav.menus": ("菜单", "Menus"),
    "nav.management": ("管理", "Administration"),
    "adminPage.title": ("用户", "Users"),
    "agentsPage.title": ("Agent 管理", "Agent management"),
    "rbacPage.title": ("权限与角色", "Permissions & roles"),
}


def upgrade():
    op.add_column("menu", sa.Column("title_zh", sa.String(length=150), nullable=True))
    op.add_column("menu", sa.Column("title_en", sa.String(length=150), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, title_key FROM menu")).fetchall()
    for row in rows:
        title_zh, title_en = TITLE_KEY_MAP.get(row.title_key, (row.title_key, row.title_key))
        connection.execute(
            sa.text(
                "UPDATE menu SET title_zh = :title_zh, title_en = :title_en WHERE id = :id"
            ),
            {"title_zh": title_zh, "title_en": title_en, "id": row.id},
        )

    op.alter_column("menu", "title_zh", nullable=False)
    op.alter_column("menu", "title_en", nullable=False)
    op.drop_column("menu", "title_key")


def downgrade():
    op.add_column("menu", sa.Column("title_key", sa.String(length=150), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT id, title_en FROM menu")
    ).fetchall()
    for row in rows:
        connection.execute(
            sa.text("UPDATE menu SET title_key = :title_key WHERE id = :id"),
            {"title_key": row.title_en, "id": row.id},
        )

    op.alter_column("menu", "title_key", nullable=False)
    op.drop_column("menu", "title_en")
    op.drop_column("menu", "title_zh")
