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
import { resolveMenuTitle } from "@/utils/menuTitle"
import { Main, type NavItem } from "./Main"
import { User } from "./User"

function menuNodeToNavItem(n: MenuTreePublic, language: string): NavItem {
  const item: NavItem = {
    icon: resolveMenuIcon(n.icon),
    title: resolveMenuTitle(n, language),
    path: n.path,
  }
  if (n.children?.length) {
    return {
      ...item,
      children: n.children.map((c) => menuNodeToNavItem(c, language)),
    }
  }
  return item
}

function menuTreeToNavItems(
  nodes: MenuTreePublic[],
  language: string,
): NavItem[] {
  return nodes.map((n) => menuNodeToNavItem(n, language))
}

export function AppSidebar() {
  const { user: currentUser } = useAuth()
  const { i18n } = useTranslation()

  const menusQuery = useQuery({
    queryKey: ["menus", "me"],
    queryFn: () => MenusService.readMenusMe(),
    enabled: isLoggedIn(),
  })

  const items = useMemo(() => {
    const tree = menusQuery.data?.data
    if (tree?.length) {
      return menuTreeToNavItems(tree, i18n.language)
    }
    return []
  }, [menusQuery.data?.data, i18n.language])

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
