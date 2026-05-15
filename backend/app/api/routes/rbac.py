import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Message,
    Permission,
    PermissionPublic,
    PermissionsPublic,
    Role,
    RoleCreate,
    RolePermissionIds,
    RolePermissionLink,
    RolePublic,
    RolesWithPermissionsPublic,
    RoleUpdate,
    RoleWithPermissions,
    User,
    UserRoleIds,
    UserRoleLink,
    UserRolesPublic,
)
from app.services.rbac import set_role_permissions, set_user_roles

router = APIRouter(
    prefix="/rbac",
    tags=["rbac"],
    dependencies=[Depends(get_current_active_superuser)],
)


def _permission_to_public(p: Permission) -> PermissionPublic:
    return PermissionPublic(id=p.id, code=p.code, name=p.name)


def _role_to_public(r: Role) -> RolePublic:
    return RolePublic(
        id=r.id,
        name=r.name,
        description=r.description,
        is_system=r.is_system,
    )


def _role_with_permissions(session: Session, role: Role) -> RoleWithPermissions:
    perms = session.exec(
        select(Permission)
        .join(RolePermissionLink, RolePermissionLink.permission_id == Permission.id)
        .where(RolePermissionLink.role_id == role.id)
        .order_by(col(Permission.code))
    ).all()
    rp = _role_to_public(role)
    return RoleWithPermissions.model_validate({
        **rp.model_dump(),
        "permissions": [_permission_to_public(p) for p in perms],
    })


@router.get("/permissions", response_model=PermissionsPublic)
def read_permissions(session: SessionDep) -> Any:
    count = session.exec(select(func.count()).select_from(Permission)).one()
    rows = session.exec(select(Permission).order_by(col(Permission.code))).all()
    return PermissionsPublic(
        data=[_permission_to_public(p) for p in rows],
        count=count,
    )


@router.get("/roles", response_model=RolesWithPermissionsPublic)
def read_roles(session: SessionDep) -> Any:
    count = session.exec(select(func.count()).select_from(Role)).one()
    roles = session.exec(select(Role).order_by(col(Role.name))).all()
    return RolesWithPermissionsPublic(
        data=[_role_with_permissions(session, r) for r in roles],
        count=count,
    )


@router.post("/roles", response_model=RoleWithPermissions)
def create_role(*, session: SessionDep, body: RoleCreate) -> Any:
    existing = session.exec(select(Role).where(Role.name == body.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")
    role = Role(name=body.name, description=body.description, is_system=False)
    session.add(role)
    session.commit()
    session.refresh(role)
    return _role_with_permissions(session, role)


@router.patch("/roles/{role_id}", response_model=RoleWithPermissions)
def update_role(
    *, session: SessionDep, role_id: uuid.UUID, body: RoleUpdate
) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    data = body.model_dump(exclude_unset=True)
    if role.is_system and "name" in data and data["name"] != role.name:
        raise HTTPException(status_code=400, detail="Cannot rename a system role")
    role.sqlmodel_update(data)
    session.add(role)
    session.commit()
    session.refresh(role)
    return _role_with_permissions(session, role)


@router.delete("/roles/{role_id}", response_model=Message)
def delete_role(*, session: SessionDep, role_id: uuid.UUID) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete a system role")
    session.delete(role)
    session.commit()
    return Message(message="Role deleted")


@router.put("/roles/{role_id}/permissions", response_model=RoleWithPermissions)
def update_role_permissions(
    *, session: SessionDep, role_id: uuid.UUID, body: RolePermissionIds
) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if body.permission_ids:
        perm_ids = list({*body.permission_ids})
        rows = session.exec(
            select(Permission.id).where(col(Permission.id).in_(perm_ids))
        ).all()
        if len(rows) != len(perm_ids):
            raise HTTPException(
                status_code=400, detail="One or more permission ids are invalid"
            )
    set_role_permissions(session, role_id, body.permission_ids)
    session.refresh(role)
    return _role_with_permissions(session, role)


@router.get("/users/{user_id}/roles", response_model=UserRolesPublic)
def read_user_roles(*, session: SessionDep, user_id: uuid.UUID) -> Any:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    stmt = (
        select(Role)
        .join(UserRoleLink, UserRoleLink.role_id == Role.id)
        .where(UserRoleLink.user_id == user_id)
        .order_by(col(Role.name))
    )
    roles = session.exec(stmt).all()
    return UserRolesPublic(data=[_role_to_public(r) for r in roles], count=len(roles))


@router.put("/users/{user_id}/roles", response_model=UserRolesPublic)
def update_user_roles(
    *, session: SessionDep, user_id: uuid.UUID, body: UserRoleIds
) -> Any:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.role_ids:
        role_ids = list({*body.role_ids})
        rows = session.exec(select(Role.id).where(col(Role.id).in_(role_ids))).all()
        if len(rows) != len(role_ids):
            raise HTTPException(status_code=400, detail="One or more role ids are invalid")
    set_user_roles(session, user_id, body.role_ids)
    return read_user_roles(session=session, user_id=user_id)
