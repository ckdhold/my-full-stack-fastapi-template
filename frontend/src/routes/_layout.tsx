import {
  createFileRoute,
  isRedirect,
  Outlet,
  redirect,
} from "@tanstack/react-router"

import { MenusService } from "@/client"
import { Appearance } from "@/components/Common/Appearance"
import { Footer } from "@/components/Common/Footer"
import { CompactLanguageSwitcher } from "@/components/Common/LanguageSwitcher"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"
import { queryClient } from "@/queryClient"
import { flattenMenuPaths, isPathAllowedByMenus } from "@/utils/menuRoutes"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async ({ location }) => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
    try {
      const res = await queryClient.ensureQueryData({
        queryKey: ["menus", "me"],
        queryFn: () => MenusService.readMenusMe(),
      })
      const paths = new Set(flattenMenuPaths(res.data))
      if (!isPathAllowedByMenus(location.pathname, paths)) {
        throw redirect({ to: "/" })
      }
    } catch (e) {
      if (isRedirect(e)) throw e
    }
  },
})

function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <SidebarTrigger className="-ml-1 shrink-0 text-muted-foreground" />
          <div className="flex shrink-0 items-center gap-2">
            <Appearance />
            <CompactLanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
