import { createFileRoute } from "@tanstack/react-router"

import { MenuManagement } from "@/components/Admin/MenuManagement"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/admin/menus")({
  component: MenusAdminPage,
  head: () => ({
    meta: [
      {
        title: i18n.t("meta.menus"),
      },
    ],
  }),
})

function MenusAdminPage() {
  return <MenuManagement />
}
