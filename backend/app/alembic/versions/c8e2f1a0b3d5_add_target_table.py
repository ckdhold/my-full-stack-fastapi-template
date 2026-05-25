"""Add target table for monitoring

Revision ID: c8e2f1a0b3d5
Revises: f3a91c2b8d44
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c8e2f1a0b3d5"
down_revision = "f3a91c2b8d44"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "target",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="unknown",
        ),
        sa.Column("labels", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column(
            "config_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")
        ),
        sa.Column("description", sa.String(length=500), nullable=True),
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
    op.create_index("ix_target_name", "target", ["name"], unique=False)
    op.create_index("ix_target_type", "target", ["type"], unique=False)
    op.create_index("ix_target_status", "target", ["status"], unique=False)


def downgrade():
    op.drop_index("ix_target_status", table_name="target")
    op.drop_index("ix_target_type", table_name="target")
    op.drop_index("ix_target_name", table_name="target")
    op.drop_table("target")
