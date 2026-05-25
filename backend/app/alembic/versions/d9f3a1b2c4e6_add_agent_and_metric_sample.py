"""Add agent and metric_sample tables

Revision ID: d9f3a1b2c4e6
Revises: c8e2f1a0b3d5
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d9f3a1b2c4e6"
down_revision = "c8e2f1a0b3d5"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "agent",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("host_id", sa.String(length=128), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("token_prefix", sa.String(length=16), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="offline",
        ),
        sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("host_id"),
    )
    op.create_index("ix_agent_token_prefix", "agent", ["token_prefix"], unique=False)

    op.create_table(
        "metric_sample",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("metric", sa.String(length=128), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_metric_sample_target_id", "metric_sample", ["target_id"])
    op.create_index("ix_metric_sample_metric", "metric_sample", ["metric"])
    op.create_index("ix_metric_sample_ts", "metric_sample", ["ts"])
    op.create_index(
        "ix_metric_sample_target_metric_ts",
        "metric_sample",
        ["target_id", "metric", "ts"],
    )


def downgrade():
    op.drop_index("ix_metric_sample_target_metric_ts", table_name="metric_sample")
    op.drop_index("ix_metric_sample_ts", table_name="metric_sample")
    op.drop_index("ix_metric_sample_metric", table_name="metric_sample")
    op.drop_index("ix_metric_sample_target_id", table_name="metric_sample")
    op.drop_table("metric_sample")
    op.drop_index("ix_agent_token_prefix", table_name="agent")
    op.drop_table("agent")
