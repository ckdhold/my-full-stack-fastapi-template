import uuid
from collections.abc import Iterable

from sqlmodel import Session, delete, select

from app.core import permission_codes as P
from app.models import (
    Permission,
    Role,
    RolePermissionLink,
    User,
    UserPublic,
    UserRoleLink,
)


def get_role_names_for_user(session: Session, user_id: uuid.UUID) -> list[str]:
    stmt = (
        select(Role.name)
        .join(UserRoleLink, UserRoleLink.role_id == Role.id)
        .where(UserRoleLink.user_id == user_id)
        .order_by(Role.name)
    )
    return list(session.exec(stmt).all())


def user_to_public(session: Session, user: User) -> UserPublic:
    base = UserPublic.model_validate(user)
    return base.model_copy(update={"roles": get_role_names_for_user(session, user.id)})


def get_permission_codes_for_user(session: Session, user_id: uuid.UUID) -> set[str]:
    stmt = (
        select(Permission.code)
        .join(RolePermissionLink, RolePermissionLink.permission_id == Permission.id)
        .join(UserRoleLink, UserRoleLink.role_id == RolePermissionLink.role_id)
        .where(UserRoleLink.user_id == user_id)
    )
    return set(session.exec(stmt).all())


def user_has_permission(session: Session, user: User, code: str) -> bool:
    if user.is_superuser:
        return True
    return code in get_permission_codes_for_user(session, user.id)


def user_has_any_permission(session: Session, user: User, codes: Iterable[str]) -> bool:
    if user.is_superuser:
        return True
    owned = get_permission_codes_for_user(session, user.id)
    return any(c in owned for c in codes)


def _get_permission_by_code(session: Session, code: str) -> Permission | None:
    stmt = select(Permission).where(Permission.code == code)
    return session.exec(stmt).first()


def _get_role_by_name(session: Session, name: str) -> Role | None:
    stmt = select(Role).where(Role.name == name)
    return session.exec(stmt).first()


def assign_role_to_user_by_name(session: Session, user_id: uuid.UUID, role_name: str) -> None:
    role = _get_role_by_name(session, role_name)
    if not role:
        return
    existing = session.exec(
        select(UserRoleLink).where(
            UserRoleLink.user_id == user_id,
            UserRoleLink.role_id == role.id,
        )
    ).first()
    if existing:
        return
    session.add(UserRoleLink(user_id=user_id, role_id=role.id))
    session.commit()


def set_user_roles(session: Session, user_id: uuid.UUID, role_ids: list[uuid.UUID]) -> None:
    session.exec(delete(UserRoleLink).where(UserRoleLink.user_id == user_id))
    for rid in role_ids:
        session.add(UserRoleLink(user_id=user_id, role_id=rid))
    session.commit()


def set_role_permissions(session: Session, role_id: uuid.UUID, permission_ids: list[uuid.UUID]) -> None:
    session.exec(delete(RolePermissionLink).where(RolePermissionLink.role_id == role_id))
    for pid in permission_ids:
        session.add(RolePermissionLink(role_id=role_id, permission_id=pid))
    session.commit()


def seed_rbac(session: Session) -> None:
    """Idempotent: permissions, system roles, links, bootstrap superuser role."""
    for code, name in P.DEFAULT_PERMISSIONS:
        if _get_permission_by_code(session, code) is None:
            session.add(Permission(code=code, name=name))
    session.commit()

    admin_role = _get_role_by_name(session, P.ROLE_ADMIN)
    if admin_role is None:
        admin_role = Role(
            name=P.ROLE_ADMIN,
            description="Full application permissions",
            is_system=True,
        )
        session.add(admin_role)
        session.commit()
        session.refresh(admin_role)

    user_role = _get_role_by_name(session, P.ROLE_USER)
    if user_role is None:
        user_role = Role(
            name=P.ROLE_USER,
            description="Default role for registered users",
            is_system=True,
        )
        session.add(user_role)
        session.commit()
        session.refresh(user_role)

    all_perm_ids = list(session.exec(select(Permission.id)).all())
    admin_perm_stmt = select(RolePermissionLink.permission_id).where(
        RolePermissionLink.role_id == admin_role.id
    )
    existing_admin_perm = set(session.exec(admin_perm_stmt).all())
    for pid in all_perm_ids:
        if pid not in existing_admin_perm:
            session.add(RolePermissionLink(role_id=admin_role.id, permission_id=pid))
    session.commit()

    default_user_codes = {
        P.ITEMS_READ,
        P.ITEMS_WRITE,
    }
    default_user_perm_ids = list(
        session.exec(
            select(Permission.id).where(
                Permission.code.in_(list(default_user_codes))  # type: ignore[attr-defined]
            )
        ).all()
    )
    user_perm_stmt = select(RolePermissionLink.permission_id).where(
        RolePermissionLink.role_id == user_role.id
    )
    existing_user_perm = set(session.exec(user_perm_stmt).all())
    for pid in default_user_perm_ids:
        if pid not in existing_user_perm:
            session.add(RolePermissionLink(role_id=user_role.id, permission_id=pid))
    session.commit()


def ensure_superuser_has_admin_role(session: Session, superuser_email: str) -> None:
    from app.core.config import settings

    email = superuser_email or settings.FIRST_SUPERUSER
    user = session.exec(select(User).where(User.email == email)).first()
    admin_role = _get_role_by_name(session, P.ROLE_ADMIN)
    if not user or not admin_role:
        return
    assign_role_to_user_by_name(session, user.id, P.ROLE_ADMIN)
