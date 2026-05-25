import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import SessionDep, require_permission
from app.core import permission_codes as P
from app.models import (
    Message,
    NotificationChannel,
    NotificationChannelCreate,
    NotificationChannelPublic,
    NotificationChannelsPublic,
    NotificationChannelUpdate,
    NotificationLog,
    NotificationLogPublic,
    NotificationLogsPublic,
    NotificationPoliciesPublic,
    NotificationPolicy,
    NotificationPolicyCreate,
    NotificationPolicyPublic,
    NotificationPolicyUpdate,
)
from app.services.notifications import (
    policy_to_public,
    send_test_notification,
    validate_channel_type,
    validate_severity,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])

_read = [Depends(require_permission(P.NOTIFICATIONS_READ))]
_manage = [Depends(require_permission(P.NOTIFICATIONS_MANAGE))]


def _mask_channel_config(channel: NotificationChannel) -> dict:
    config = dict(channel.config_json or {})
    if "secret" in config and config["secret"]:
        config["secret"] = "***"
    return config


def _channel_public(channel: NotificationChannel) -> NotificationChannelPublic:
    data = channel.model_dump()
    data["config_json"] = _mask_channel_config(channel)
    return NotificationChannelPublic.model_validate(data)


@router.get("/channels/", response_model=NotificationChannelsPublic, dependencies=_read)
def read_notification_channels(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    count = session.exec(select(func.count()).select_from(NotificationChannel)).one()
    channels = session.exec(
        select(NotificationChannel)
        .order_by(col(NotificationChannel.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return NotificationChannelsPublic(
        data=[_channel_public(c) for c in channels],
        count=count,
    )


@router.post("/channels/", response_model=NotificationChannelPublic, dependencies=_manage)
def create_notification_channel(
    session: SessionDep, body: NotificationChannelCreate
) -> Any:
    validate_channel_type(body.type)
    channel = NotificationChannel.model_validate(body)
    session.add(channel)
    session.commit()
    session.refresh(channel)
    return _channel_public(channel)


@router.put("/channels/{id}", response_model=NotificationChannelPublic, dependencies=_manage)
def update_notification_channel(
    session: SessionDep, id: uuid.UUID, body: NotificationChannelUpdate
) -> Any:
    channel = session.get(NotificationChannel, id)
    if not channel:
        raise HTTPException(status_code=404, detail="Notification channel not found")
    data = body.model_dump(exclude_unset=True)
    if "type" in data and data["type"] is not None:
        validate_channel_type(data["type"])
    if "config_json" in data and data["config_json"] is not None:
        existing = channel.config_json or {}
        incoming = data["config_json"]
        if incoming.get("secret") == "***":
            incoming["secret"] = existing.get("secret")
        data["config_json"] = incoming
    channel.sqlmodel_update(data)
    session.add(channel)
    session.commit()
    session.refresh(channel)
    return _channel_public(channel)


@router.delete("/channels/{id}", dependencies=_manage)
def delete_notification_channel(session: SessionDep, id: uuid.UUID) -> Message:
    channel = session.get(NotificationChannel, id)
    if not channel:
        raise HTTPException(status_code=404, detail="Notification channel not found")
    session.delete(channel)
    session.commit()
    return Message(message="Notification channel deleted successfully")


@router.post("/channels/{id}/test", dependencies=_manage)
def test_notification_channel(session: SessionDep, id: uuid.UUID) -> Message:
    channel = session.get(NotificationChannel, id)
    if not channel:
        raise HTTPException(status_code=404, detail="Notification channel not found")
    try:
        send_test_notification(session, channel)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Message(message="Test notification sent successfully")


@router.get("/policies/", response_model=NotificationPoliciesPublic, dependencies=_read)
def read_notification_policies(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    count = session.exec(select(func.count()).select_from(NotificationPolicy)).one()
    policies = session.exec(
        select(NotificationPolicy)
        .order_by(col(NotificationPolicy.severity), col(NotificationPolicy.created_at))
        .offset(skip)
        .limit(limit)
    ).all()
    return NotificationPoliciesPublic(
        data=[
            NotificationPolicyPublic.model_validate(policy_to_public(session, p))
            for p in policies
        ],
        count=count,
    )


@router.post("/policies/", response_model=NotificationPolicyPublic, dependencies=_manage)
def create_notification_policy(
    session: SessionDep, body: NotificationPolicyCreate
) -> Any:
    validate_severity(body.severity)
    channel = session.get(NotificationChannel, body.channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Notification channel not found")
    existing = session.exec(
        select(NotificationPolicy).where(
            NotificationPolicy.severity == body.severity,
            NotificationPolicy.channel_id == body.channel_id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Policy already exists")
    policy = NotificationPolicy.model_validate(body)
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return NotificationPolicyPublic.model_validate(policy_to_public(session, policy))


@router.put("/policies/{id}", response_model=NotificationPolicyPublic, dependencies=_manage)
def update_notification_policy(
    session: SessionDep, id: uuid.UUID, body: NotificationPolicyUpdate
) -> Any:
    policy = session.get(NotificationPolicy, id)
    if not policy:
        raise HTTPException(status_code=404, detail="Notification policy not found")
    data = body.model_dump(exclude_unset=True)
    if "severity" in data and data["severity"] is not None:
        validate_severity(data["severity"])
    if "channel_id" in data and data["channel_id"] is not None:
        channel = session.get(NotificationChannel, data["channel_id"])
        if not channel:
            raise HTTPException(status_code=404, detail="Notification channel not found")
    policy.sqlmodel_update(data)
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return NotificationPolicyPublic.model_validate(policy_to_public(session, policy))


@router.delete("/policies/{id}", dependencies=_manage)
def delete_notification_policy(session: SessionDep, id: uuid.UUID) -> Message:
    policy = session.get(NotificationPolicy, id)
    if not policy:
        raise HTTPException(status_code=404, detail="Notification policy not found")
    session.delete(policy)
    session.commit()
    return Message(message="Notification policy deleted successfully")


@router.get("/logs/", response_model=NotificationLogsPublic, dependencies=_read)
def read_notification_logs(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    count = session.exec(select(func.count()).select_from(NotificationLog)).one()
    logs = session.exec(
        select(NotificationLog)
        .order_by(col(NotificationLog.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return NotificationLogsPublic(
        data=[NotificationLogPublic.model_validate(log) for log in logs],
        count=count,
    )
