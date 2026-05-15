import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export type NavItem = {
  icon: LucideIcon
  title: string
  path: string
  children?: NavItem[]
}

function pathIsActive(path: string, currentPath: string): boolean {
  if (path.startsWith("__")) return false
  if (path === "/") return currentPath === "/"
  return currentPath === path || currentPath.startsWith(`${path}/`)
}

function subtreeHasActive(item: NavItem, currentPath: string): boolean {
  if (pathIsActive(item.path, currentPath)) return true
  return item.children?.some((c) => subtreeHasActive(c, currentPath)) ?? false
}

interface MainProps {
  items: NavItem[]
}

function NavGroup({
  item,
  currentPath,
  onNavigate,
}: {
  item: NavItem
  currentPath: string
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(() => subtreeHasActive(item, currentPath))

  useEffect(() => {
    if (subtreeHasActive(item, currentPath)) setOpen(true)
  }, [currentPath, item])

  const groupActive = subtreeHasActive(item, currentPath)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        tooltip={item.title}
        isActive={groupActive}
        className="cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
      {open ? (
        <SidebarMenuSub>
          {item.children!.map((child) => (
            <SidebarMenuSubItem key={child.path}>
              <SidebarMenuSubButton
                asChild
                size="sm"
                isActive={pathIsActive(child.path, currentPath)}
              >
                <RouterLink to={child.path} onClick={onNavigate}>
                  <child.icon />
                  <span>{child.title}</span>
                </RouterLink>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
}

export function Main({ items }: MainProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            if (item.children?.length) {
              return (
                <NavGroup
                  key={item.path}
                  item={item}
                  currentPath={currentPath}
                  onNavigate={handleMenuClick}
                />
              )
            }
            const isActive = pathIsActive(item.path, currentPath)
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  asChild
                >
                  <RouterLink to={item.path} onClick={handleMenuClick}>
                    <item.icon />
                    <span>{item.title}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** @deprecated use NavItem */
export type Item = NavItem
