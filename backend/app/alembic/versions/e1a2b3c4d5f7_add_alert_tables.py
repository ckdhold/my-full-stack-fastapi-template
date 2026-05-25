"""Add alert_rule and alert tables

Revision ID: e1a2b3c4d5f7
Revises: d9f3a1b2c4e6
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e1a2b3c4d5f7"
down_revision = "d9f3a1b2c4e6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "alert_rule",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("metric", sa.String(length=128), nullable=False),
        sa.Column("operator", sa.String(length=8), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("duration_sec", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("severity", sa.String(length=8), nullable=False, server_default="p2"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("no_data_sec", sa.Integer(), nullable=True),
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
        sa.ForeignKeyConstraint(["target_id"], ["target.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "alert",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.String(length=8), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("current_value", sa.Float(), nullable=True),
        sa.Column(
            "fired_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ack_note", sa.String(length=500), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["rule_id"], ["alert_rule.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["acknowledged_by"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alert_status", "alert", ["status"])
    op.create_index("ix_alert_rule_id", "alert", ["rule_id"])


def downgrade():
    op.drop_index("ix_alert_rule_id", table_name="alert")
    op.drop_index("ix_alert_status", table_name="alert")
    op.drop_table("alert")
    op.drop_table("alert_rule")
