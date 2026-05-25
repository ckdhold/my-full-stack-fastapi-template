"""Add notification channel, policy and log tables

Revision ID: f2a3b4c5d6e8
Revises: e1a2b3c4d5f7
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f2a3b4c5d6e8"
down_revision = "e1a2b3c4d5f7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notification_channel",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("config_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "notification_policy",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("severity", sa.String(length=8), nullable=False),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["channel_id"], ["notification_channel.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notification_policy_severity_channel",
        "notification_policy",
        ["severity", "channel_id"],
        unique=True,
    )
    op.create_table(
        "notification_log",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("alert_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("channel_type", sa.String(length=32), nullable=False),
        sa.Column("channel_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("error", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["alert_id"], ["alert.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["channel_id"], ["notification_channel.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("notification_log")
    op.drop_index("ix_notification_policy_severity_channel", table_name="notification_policy")
    op.drop_table("notification_policy")
    op.drop_table("notification_channel")
