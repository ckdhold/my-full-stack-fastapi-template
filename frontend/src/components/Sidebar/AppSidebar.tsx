import { Briefcase, Home, Users } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

export function AppSidebar() {
  const { user: currentUser } = useAuth()
  const { t } = useTranslation()

  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      { icon: Home, title: t("nav.dashboard"), path: "/" },
      { icon: Briefcase, title: t("nav.items"), path: "/items" },
    ]
    return currentUser?.is_superuser
      ? [...base, { icon: Users, title: t("nav.admin"), path: "/admin" }]
      : base
  }, [currentUser?.is_superuser, t])

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
