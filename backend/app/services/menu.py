import uuid
from collections import defaultdict

from sqlmodel import Session, delete, select

from app.core import permission_codes as P
from app.models import Menu, MenuTreePublic, RoleMenuLink, User
from app.services.rbac import _get_role_by_name, user_has_permission

GROUP_PATH_PREFIX = "__group."


def _menu_to_tree_public(m: Menu, children_map: dict[uuid.UUID, list[Menu]]) -> MenuTreePublic:
    kids = sorted(children_map.get(m.id, []), key=lambda x: (x.sort_order, x.path))
    return MenuTreePublic(
        id=m.id,
        parent_id=m.parent_id,
        path=m.path,
        title_zh=m.title_zh,
        title_en=m.title_en,
        icon=m.icon,
        sort_order=m.sort_order,
        is_active=m.is_active,
        required_permission_code=m.required_permission_code,
        children=[_menu_to_tree_public(c, children_map) for c in kids],
    )


def _with_active_parents(session: Session, menus: list[Menu]) -> list[Menu]:
    """Include ancestor rows so nested menus render (parent may lack role links)."""
    by_id: dict[uuid.UUID, Menu] = {m.id: m for m in menus}
    changed = True
    while changed:
        changed = False
        for m in list(by_id.values()):
            if m.parent_id is None or m.parent_id in by_id:
                continue
            p = session.get(Menu, m.parent_id)
            if p and p.is_active:
                by_id[p.id] = p
                changed = True
    return sorted(by_id.values(), key=lambda x: (x.sort_order, x.path))


def _visible_menus_flat(session: Session, user: User) -> list[Menu]:
    stmt = (
        select(Menu)
        .where(Menu.is_active == True)  # noqa: E712
        .order_by(Menu.sort_order, Menu.path)
    )
    all_menus = list(session.exec(stmt).all())
    if user.is_superuser:
        return _with_active_parents(session, all_menus)

    from app.models import UserRoleLink

    user_role_ids = list(
        session.exec(select(UserRoleLink.role_id).where(UserRoleLink.user_id == user.id)).all()
    )
    if not user_role_ids:
        return []

    allowed_menu_ids: set[uuid.UUID] = set(
        session.exec(
            select(RoleMenuLink.menu_id).where(
                RoleMenuLink.role_id.in_(user_role_ids)  # type: ignore[attr-defined]
            )
        ).all()
    )

    out: list[Menu] = []
    for m in all_menus:
        if m.id not in allowed_menu_ids:
            continue
        if m.required_permission_code and not user_has_permission(
            session, user, m.required_permission_code
        ):
            continue
        out.append(m)
    return _with_active_parents(session, out)


def menu_tree_for_user(session: Session, user: User) -> list[MenuTreePublic]:
    flat = _visible_menus_flat(session, user)
    if not flat:
        return []

    ids = {m.id for m in flat}
    children_map: dict[uuid.UUID, list[Menu]] = defaultdict(list)
    roots: list[Menu] = []
    for m in flat:
        if m.parent_id is not None and m.parent_id in ids:
            children_map[m.parent_id].append(m)
        else:
            roots.append(m)
    roots = sorted(roots, key=lambda x: (x.sort_order, x.path))
    return [_menu_to_tree_public(r, children_map) for r in roots]


def seed_menus(session: Session) -> None:
    """Idempotent: menus, hierarchy under 管理, and role_menu_link for admin / user."""
    admin = _get_role_by_name(session, P.ROLE_ADMIN)
    user = _get_role_by_name(session, P.ROLE_USER)
    if not admin or not user:
        return

    def ensure_menu(
        path: str,
        title_zh: str,
        title_en: str,
        icon: str | None,
        sort_order: int,
        req_perm: str | None = None,
        parent_id: uuid.UUID | None = None,
    ) -> Menu:
        existing = session.exec(select(Menu).where(Menu.path == path)).first()
        if existing:
            changed = False
            if parent_id is not None and existing.parent_id != parent_id:
                existing.parent_id = parent_id
                changed = True
            if existing.required_permission_code != req_perm:
                existing.required_permission_code = req_perm
                changed = True
            if existing.title_zh != title_zh:
                existing.title_zh = title_zh
                changed = True
            if existing.title_en != title_en:
                existing.title_en = title_en
                changed = True
            if existing.icon != icon:
                existing.icon = icon
                changed = True
            if existing.sort_order != sort_order:
                existing.sort_order = sort_order
                changed = True
            if changed:
                session.add(existing)
                session.commit()
                session.refresh(existing)
            return existing
        m = Menu(
            parent_id=parent_id,
            path=path,
            title_zh=title_zh,
            title_en=title_en,
            icon=icon,
            sort_order=sort_order,
            is_active=True,
            required_permission_code=req_perm,
        )
        session.add(m)
        session.commit()
        session.refresh(m)
        return m

    def link_roles(menu: Menu, role_names: tuple[str, ...]) -> None:
        for rn in role_names:
            role = admin if rn == "admin" else user
            link = session.exec(
                select(RoleMenuLink).where(
                    RoleMenuLink.role_id == role.id,
                    RoleMenuLink.menu_id == menu.id,
                )
            ).first()
            if not link:
                session.add(RoleMenuLink(role_id=role.id, menu_id=menu.id))
        session.commit()

    top_level: list[
        tuple[str, str, str, str | None, int, str | None, tuple[str, ...]]
    ] = [
        ("/", "工作台", "Dashboard", "Home", 0, None, ("admin", "user")),
        ("/items", "条目", "Items", "Briefcase", 10, P.ITEMS_READ, ("admin", "user")),
    ]

    for path, title_zh, title_en, icon, sort_order, req, roles in top_level:
        m = ensure_menu(path, title_zh, title_en, icon, sort_order, req, None)
        link_roles(m, roles)

    ensure_menu("/settings", "设置", "Settings", "Settings", 50, None, None)
    settings_menu = session.exec(select(Menu).where(Menu.path == "/settings")).first()
    if settings_menu:
        link_roles(settings_menu, ("admin", "user"))

    mgmt = ensure_menu(
        f"{GROUP_PATH_PREFIX}management",
        "管理",
        "Administration",
        "PanelsTopLeft",
        20,
        None,
        None,
    )
    link_roles(mgmt, ("admin",))

    admin_children: list[tuple[str, str, str, str | None, int, str | None]] = [
        ("/admin", "用户", "Users", "Users", 10, P.USERS_READ),
        ("/admin/permissions", "权限与角色", "Permissions & roles", "Shield", 20, P.ROLES_MANAGE),
        ("/admin/menus", "菜单", "Menus", "Menu", 30, P.ROLES_MANAGE),
    ]

    for path, title_zh, title_en, icon, sort_order, req in admin_children:
        child = ensure_menu(path, title_zh, title_en, icon, sort_order, req, mgmt.id)
        link_roles(child, ("admin",))

    for path, so in (
        ("/", 0),
        ("/items", 10),
        (f"{GROUP_PATH_PREFIX}management", 20),
        ("/settings", 90),
    ):
        row = session.exec(select(Menu).where(Menu.path == path)).first()
        if row and row.sort_order != so:
            row.sort_order = so
            session.add(row)

    session.commit()


def set_menu_roles(session: Session, menu_id: uuid.UUID, role_ids: list[uuid.UUID]) -> None:
    session.exec(delete(RoleMenuLink).where(RoleMenuLink.menu_id == menu_id))
    for rid in role_ids:
        session.add(RoleMenuLink(role_id=rid, menu_id=menu_id))
    session.commit()
