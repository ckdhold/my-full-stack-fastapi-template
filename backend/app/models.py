import uuid
from datetime import datetime, timezone

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None
    roles: list[str] = Field(default_factory=list)


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# --- RBAC ----------------------------------------------------------------


class Permission(SQLModel, table=True):
    __tablename__ = "permission"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=100)
    name: str = Field(max_length=255)


class Role(SQLModel, table=True):
    __tablename__ = "role"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    is_system: bool = Field(default=False)


class RolePermissionLink(SQLModel, table=True):
    __tablename__ = "role_permission_link"

    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True, ondelete="CASCADE")
    permission_id: uuid.UUID = Field(
        foreign_key="permission.id", primary_key=True, ondelete="CASCADE"
    )


class UserRoleLink(SQLModel, table=True):
    __tablename__ = "user_role_link"

    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True, ondelete="CASCADE")
    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True, ondelete="CASCADE")


class PermissionPublic(SQLModel):
    id: uuid.UUID
    code: str
    name: str


class PermissionsPublic(SQLModel):
    data: list[PermissionPublic]
    count: int


class RoleCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)


class RoleUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)


class RolePublic(SQLModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    is_system: bool = False


class RoleWithPermissions(RolePublic):
    permissions: list[PermissionPublic] = Field(default_factory=list)


class RolesWithPermissionsPublic(SQLModel):
    data: list[RoleWithPermissions]
    count: int


class RolePermissionIds(SQLModel):
    permission_ids: list[uuid.UUID] = Field(default_factory=list)


class UserRoleIds(SQLModel):
    role_ids: list[uuid.UUID] = Field(default_factory=list)


class UserRolesPublic(SQLModel):
    data: list[RolePublic]
    count: int


class RoleMenuLink(SQLModel, table=True):
    __tablename__ = "role_menu_link"

    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True, ondelete="CASCADE")
    menu_id: uuid.UUID = Field(foreign_key="menu.id", primary_key=True, ondelete="CASCADE")


class Menu(SQLModel, table=True):
    __tablename__ = "menu"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    parent_id: uuid.UUID | None = Field(
        default=None, foreign_key="menu.id", ondelete="CASCADE"
    )
    path: str = Field(unique=True, index=True, max_length=255)
    title_zh: str = Field(max_length=150)
    title_en: str = Field(max_length=150)
    icon: str | None = Field(default=None, max_length=80)
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)
    required_permission_code: str | None = Field(default=None, max_length=100)


class MenuPublic(SQLModel):
    id: uuid.UUID
    parent_id: uuid.UUID | None = None
    path: str
    title_zh: str
    title_en: str
    icon: str | None = None
    sort_order: int = 0
    is_active: bool = True
    required_permission_code: str | None = None


class MenuTreePublic(MenuPublic):
    children: list["MenuTreePublic"] = Field(default_factory=list)


class MenusTreePublic(SQLModel):
    data: list[MenuTreePublic]
    count: int


class MenuCreate(SQLModel):
    parent_id: uuid.UUID | None = None
    path: str = Field(min_length=1, max_length=255)
    title_zh: str = Field(min_length=1, max_length=150)
    title_en: str = Field(min_length=1, max_length=150)
    icon: str | None = Field(default=None, max_length=80)
    sort_order: int = 0
    is_active: bool = True
    required_permission_code: str | None = Field(default=None, max_length=100)


class MenuUpdate(SQLModel):
    parent_id: uuid.UUID | None = None
    path: str | None = Field(default=None, min_length=1, max_length=255)
    title_zh: str | None = Field(default=None, min_length=1, max_length=150)
    title_en: str | None = Field(default=None, min_length=1, max_length=150)
    icon: str | None = Field(default=None, max_length=80)
    sort_order: int | None = None
    is_active: bool | None = None
    required_permission_code: str | None = Field(default=None, max_length=100)


class MenuRoleIds(SQLModel):
    role_ids: list[uuid.UUID] = Field(default_factory=list)


class MenuRolesPublic(SQLModel):
    data: list[RolePublic]
    count: int


class MenusPublic(SQLModel):
    data: list[MenuPublic]
    count: int


MenuTreePublic.model_rebuild()
