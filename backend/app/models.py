import uuid
from datetime import datetime, timezone

from pydantic import EmailStr
from sqlalchemy import DateTime, JSON
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


# --- Monitoring ----------------------------------------------------------


class TargetType(str):
    HOST = "host"
    HTTP = "http"
    TCP = "tcp"
    DATABASE = "database"
    BUSINESS = "business"
    CUSTOM = "custom"


class TargetStatus(str):
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"
    ALERT = "alert"


class TargetBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(max_length=32)
    status: str = Field(default=TargetStatus.UNKNOWN, max_length=32)
    labels: dict[str, str] = Field(default_factory=dict, sa_type=JSON)
    config_json: dict[str, object] = Field(default_factory=dict, sa_type=JSON)
    description: str | None = Field(default=None, max_length=500)


class TargetCreate(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(max_length=32)
    labels: dict[str, str] = Field(default_factory=dict)
    config_json: dict[str, object] = Field(default_factory=dict)
    description: str | None = Field(default=None, max_length=500)
    status: str | None = Field(default=None, max_length=32)


class TargetUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: str | None = Field(default=None, max_length=32)
    status: str | None = Field(default=None, max_length=32)
    labels: dict[str, str] | None = None
    config_json: dict[str, object] | None = None
    description: str | None = Field(default=None, max_length=500)


class Target(TargetBase, table=True):
    __tablename__ = "target"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class TargetPublic(TargetBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TargetsPublic(SQLModel):
    data: list[TargetPublic]
    count: int


class TargetSummary(SQLModel):
    total: int
    online: int
    offline: int
    alert: int
    unknown: int


class AgentStatus(str):
    ONLINE = "online"
    OFFLINE = "offline"


class AgentBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    host_id: str = Field(min_length=1, max_length=128)
    version: str | None = Field(default=None, max_length=32)


class AgentCreate(AgentBase):
    pass


class Agent(AgentBase, table=True):
    __tablename__ = "agent"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    target_id: uuid.UUID | None = Field(
        default=None, foreign_key="target.id", ondelete="SET NULL"
    )
    token_prefix: str = Field(max_length=16, index=True)
    token_hash: str = Field(max_length=255)
    status: str = Field(default=AgentStatus.OFFLINE, max_length=32)
    last_heartbeat_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class AgentPublic(AgentBase):
    id: uuid.UUID
    target_id: uuid.UUID | None = None
    status: str
    last_heartbeat_at: datetime | None = None
    created_at: datetime | None = None


class AgentCreatedPublic(SQLModel):
    agent: AgentPublic
    token: str


class AgentsPublic(SQLModel):
    data: list[AgentPublic]
    count: int


class MetricPoint(SQLModel):
    metric: str = Field(min_length=1, max_length=128)
    value: float
    ts: datetime | None = None
    labels: dict[str, str] = Field(default_factory=dict)


class MetricsPush(SQLModel):
    metrics: list[MetricPoint] = Field(min_length=1)


class MetricSample(SQLModel, table=True):
    __tablename__ = "metric_sample"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    target_id: uuid.UUID = Field(
        foreign_key="target.id", nullable=False, ondelete="CASCADE", index=True
    )
    metric: str = Field(max_length=128, index=True)
    value: float
    labels: dict[str, str] = Field(default_factory=dict, sa_type=JSON)
    ts: datetime = Field(
        sa_type=DateTime(timezone=True),  # type: ignore
        index=True,
    )


class MetricSamplePublic(SQLModel):
    id: uuid.UUID
    target_id: uuid.UUID
    metric: str
    value: float
    labels: dict[str, str] = Field(default_factory=dict)
    ts: datetime


class MetricSamplesPublic(SQLModel):
    data: list[MetricSamplePublic]
    count: int


class AlertSeverity(str):
    P0 = "p0"
    P1 = "p1"
    P2 = "p2"
    P3 = "p3"


class AlertStatus(str):
    FIRING = "firing"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class AlertOperator(str):
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    EQ = "eq"


class AlertRuleBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    target_id: uuid.UUID = Field(foreign_key="target.id", ondelete="CASCADE")
    metric: str = Field(min_length=1, max_length=128)
    operator: str = Field(max_length=8)
    threshold: float
    duration_sec: int = Field(default=0, ge=0)
    severity: str = Field(default=AlertSeverity.P2, max_length=8)
    enabled: bool = Field(default=True)
    no_data_sec: int | None = Field(default=None, ge=0)


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    target_id: uuid.UUID | None = None
    metric: str | None = Field(default=None, min_length=1, max_length=128)
    operator: str | None = Field(default=None, max_length=8)
    threshold: float | None = None
    duration_sec: int | None = Field(default=None, ge=0)
    severity: str | None = Field(default=None, max_length=8)
    enabled: bool | None = None
    no_data_sec: int | None = Field(default=None, ge=0)


class AlertRule(AlertRuleBase, table=True):
    __tablename__ = "alert_rule"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class AlertRulePublic(AlertRuleBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AlertRulesPublic(SQLModel):
    data: list[AlertRulePublic]
    count: int


class AlertBase(SQLModel):
    rule_id: uuid.UUID = Field(foreign_key="alert_rule.id", ondelete="CASCADE")
    target_id: uuid.UUID = Field(foreign_key="target.id", ondelete="CASCADE")
    status: str = Field(max_length=32)
    severity: str = Field(max_length=8)
    message: str = Field(max_length=500)
    current_value: float | None = None


class Alert(AlertBase, table=True):
    __tablename__ = "alert"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    fired_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    acknowledged_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    acknowledged_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", ondelete="SET NULL"
    )
    ack_note: str | None = Field(default=None, max_length=500)
    resolved_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class AlertPublic(AlertBase):
    id: uuid.UUID
    fired_at: datetime
    acknowledged_at: datetime | None = None
    acknowledged_by: uuid.UUID | None = None
    ack_note: str | None = None
    resolved_at: datetime | None = None
    rule_name: str | None = None
    target_name: str | None = None


class AlertsPublic(SQLModel):
    data: list[AlertPublic]
    count: int


class AlertSummary(SQLModel):
    firing: int
    acknowledged: int
    resolved: int


class AlertAck(SQLModel):
    note: str | None = Field(default=None, max_length=500)


class NotificationChannelType(str):
    EMAIL = "email"
    DINGTALK = "dingtalk"


class NotificationChannelBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(max_length=32)
    enabled: bool = Field(default=True)
    config_json: dict = Field(default_factory=dict, sa_type=JSON)  # type: ignore


class NotificationChannelCreate(NotificationChannelBase):
    pass


class NotificationChannelUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: str | None = Field(default=None, max_length=32)
    enabled: bool | None = None
    config_json: dict | None = None


class NotificationChannel(NotificationChannelBase, table=True):
    __tablename__ = "notification_channel"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class NotificationChannelPublic(NotificationChannelBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class NotificationChannelsPublic(SQLModel):
    data: list[NotificationChannelPublic]
    count: int


class NotificationPolicyBase(SQLModel):
    severity: str = Field(max_length=8)
    channel_id: uuid.UUID = Field(
        foreign_key="notification_channel.id", ondelete="CASCADE"
    )
    enabled: bool = Field(default=True)


class NotificationPolicyCreate(NotificationPolicyBase):
    pass


class NotificationPolicyUpdate(SQLModel):
    severity: str | None = Field(default=None, max_length=8)
    channel_id: uuid.UUID | None = None
    enabled: bool | None = None


class NotificationPolicy(NotificationPolicyBase, table=True):
    __tablename__ = "notification_policy"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class NotificationPolicyPublic(NotificationPolicyBase):
    id: uuid.UUID
    created_at: datetime | None = None
    channel_name: str | None = None
    channel_type: str | None = None


class NotificationPoliciesPublic(SQLModel):
    data: list[NotificationPolicyPublic]
    count: int


class NotificationLogStatus(str):
    SUCCESS = "success"
    FAILED = "failed"


class NotificationLogBase(SQLModel):
    alert_id: uuid.UUID | None = Field(
        default=None, foreign_key="alert.id", ondelete="SET NULL"
    )
    channel_id: uuid.UUID | None = Field(
        default=None, foreign_key="notification_channel.id", ondelete="SET NULL"
    )
    channel_type: str = Field(max_length=32)
    channel_name: str = Field(max_length=255)
    status: str = Field(max_length=16)
    message: str = Field(max_length=500)
    error: str | None = Field(default=None, max_length=500)


class NotificationLog(NotificationLogBase, table=True):
    __tablename__ = "notification_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class NotificationLogPublic(NotificationLogBase):
    id: uuid.UUID
    created_at: datetime | None = None


class NotificationLogsPublic(SQLModel):
    data: list[NotificationLogPublic]
    count: int

