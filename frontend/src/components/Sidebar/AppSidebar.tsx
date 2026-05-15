import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { MenusService, type MenuTreePublic } from "@/client"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { resolveMenuIcon } from "@/utils/menuIcon"
import { Main, type NavItem } from "./Main"
import { User } from "./User"

function menuNodeToNavItem(
  n: MenuTreePublic,
  t: (key: string) => string,
): NavItem {
  const item: NavItem = {
    icon: resolveMenuIcon(n.icon),
    title: t(n.title_key),
    path: n.path,
  }
  if (n.children?.length) {
    return {
      ...item,
      children: n.children.map((c) => menuNodeToNavItem(c, t)),
    }
  }
  return item
}

function menuTreeToNavItems(
  nodes: MenuTreePublic[],
  t: (key: string) => string,
): NavItem[] {
  return nodes.map((n) => menuNodeToNavItem(n, t))
}

export function AppSidebar() {
  const { user: currentUser } = useAuth()
  const { t } = useTranslation()

  const menusQuery = useQuery({
    queryKey: ["menus", "me"],
    queryFn: () => MenusService.readMenusMe(),
    enabled: isLoggedIn(),
  })

  const items = useMemo(() => {
    const tree = menusQuery.data?.data
    if (tree?.length) {
      return menuTreeToNavItems(tree, t)
    }
    const base: NavItem[] = [
      { icon: resolveMenuIcon("Home"), title: t("nav.dashboard"), path: "/" },
      {
        icon: resolveMenuIcon("Briefcase"),
        title: t("nav.items"),
        path: "/items",
      },
    ]
    if (currentUser?.is_superuser) {
      base.push({
        icon: resolveMenuIcon("PanelsTopLeft"),
        title: t("nav.management"),
        path: "__group.management",
        children: [
          {
            icon: resolveMenuIcon("Users"),
            title: t("adminPage.title"),
            path: "/admin",
          },
          {
            icon: resolveMenuIcon("Shield"),
            title: t("rbacPage.title"),
            path: "/admin/permissions",
          },
          {
            icon: resolveMenuIcon("Menu"),
            title: t("nav.menus"),
            path: "/admin/menus",
          },
        ],
      })
    }
    base.push({
      icon: resolveMenuIcon("Settings"),
      title: t("nav.settings"),
      path: "/settings",
    })
    return base
  }, [menusQuery.data?.data, t, currentUser?.is_superuser])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
