"""Add menu and role_menu_link tables

Revision ID: f3a91c2b8d44
Revises: e4c2b8a91f0d
Create Date: 2026-05-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f3a91c2b8d44"
down_revision = "e4c2b8a91f0d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "menu",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("path", sa.String(length=255), nullable=False),
        sa.Column("title_key", sa.String(length=150), nullable=False),
        sa.Column("icon", sa.String(length=80), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("required_permission_code", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["parent_id"], ["menu.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("path"),
    )

    op.create_table(
        "role_menu_link",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("menu_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["menu_id"], ["menu.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["role.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("role_id", "menu_id"),
    )


def downgrade():
    op.drop_table("role_menu_link")
    op.drop_table("menu")
