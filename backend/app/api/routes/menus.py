import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import ProgrammingError
from sqlmodel import Session, col, func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    Menu,
    MenuCreate,
    MenuPublic,
    MenuRoleIds,
    MenuRolesPublic,
    MenuTreePublic,
    MenuUpdate,
    MenusPublic,
    MenusTreePublic,
    Message,
    Role,
    RoleMenuLink,
    RolePublic,
)
from app.services.menu import menu_tree_for_user, set_menu_roles

router = APIRouter(prefix="/menus", tags=["menus"])
_admin = [Depends(get_current_active_superuser)]


def _menu_public(m: Menu) -> MenuPublic:
    return MenuPublic.model_validate(m)


def _count_tree(nodes: list[MenuTreePublic]) -> int:
    n = len(nodes)
    for c in nodes:
        n += _count_tree(c.children)
    return n


@router.get("/me", response_model=MenusTreePublic)
def read_menus_me(session: SessionDep, current_user: CurrentUser) -> Any:
    try:
        tree = menu_tree_for_user(session, current_user)
    except ProgrammingError as exc:
        # Common when `alembic upgrade head` has not applied the menu migration yet.
        session.rollback()
        err = str(getattr(exc, "orig", exc))
        if "menu" in err and "does not exist" in err:
            tree = []
        else:
            raise
    return MenusTreePublic(data=tree, count=_count_tree(tree))


@router.get("/", response_model=MenusPublic, dependencies=_admin)
def read_menus_admin(session: SessionDep) -> Any:
    count = session.exec(select(func.count()).select_from(Menu)).one()
    rows = session.exec(select(Menu).order_by(col(Menu.sort_order), col(Menu.path))).all()
    return MenusPublic(data=[_menu_public(m) for m in rows], count=count)


@router.post("/", response_model=MenuPublic, dependencies=_admin)
def create_menu(*, session: SessionDep, body: MenuCreate) -> Any:
    existing = session.exec(select(Menu).where(Menu.path == body.path)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Menu with this path already exists")
    m = Menu.model_validate(body)
    session.add(m)
    session.commit()
    session.refresh(m)
    return _menu_public(m)


@router.get("/{menu_id}/roles", response_model=MenuRolesPublic, dependencies=_admin)
def read_menu_roles(*, session: SessionDep, menu_id: uuid.UUID) -> Any:
    m = session.get(Menu, menu_id)
    if not m:
        raise HTTPException(status_code=404, detail="Menu not found")
    stmt = (
        select(Role)
        .join(RoleMenuLink, RoleMenuLink.role_id == Role.id)
        .where(RoleMenuLink.menu_id == menu_id)
        .order_by(col(Role.name))
    )
    roles = session.exec(stmt).all()
    rpub = [RolePublic.model_validate(r) for r in roles]
    return MenuRolesPublic(data=rpub, count=len(rpub))


@router.patch("/{menu_id}", response_model=MenuPublic, dependencies=_admin)
def update_menu(
    *, session: SessionDep, menu_id: uuid.UUID, body: MenuUpdate
) -> Any:
    m = session.get(Menu, menu_id)
    if not m:
        raise HTTPException(status_code=404, detail="Menu not found")
    data = body.model_dump(exclude_unset=True)
    if "path" in data and data["path"] != m.path:
        clash = session.exec(select(Menu).where(Menu.path == data["path"])).first()
        if clash:
            raise HTTPException(status_code=400, detail="Menu with this path already exists")
    m.sqlmodel_update(data)
    session.add(m)
    session.commit()
    session.refresh(m)
    return _menu_public(m)


@router.delete("/{menu_id}", response_model=Message, dependencies=_admin)
def delete_menu(*, session: SessionDep, menu_id: uuid.UUID) -> Any:
    m = session.get(Menu, menu_id)
    if not m:
        raise HTTPException(status_code=404, detail="Menu not found")
    session.delete(m)
    session.commit()
    return Message(message="Menu deleted")


@router.put("/{menu_id}/roles", response_model=Message, dependencies=_admin)
def update_menu_roles(
    *, session: SessionDep, menu_id: uuid.UUID, body: MenuRoleIds
) -> Any:
    m = session.get(Menu, menu_id)
    if not m:
        raise HTTPException(status_code=404, detail="Menu not found")
    if body.role_ids:
        role_ids = list({*body.role_ids})
        rows = session.exec(select(Role.id).where(col(Role.id).in_(role_ids))).all()
        if len(rows) != len(role_ids):
            raise HTTPException(status_code=400, detail="One or more role ids are invalid")
    set_menu_roles(session, menu_id, body.role_ids)
    return Message(message="Menu roles updated")
