import { createFileRoute } from "@tanstack/react-router"

import { PermissionsManagement } from "@/components/Admin/PermissionsManagement"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/admin/permissions")({
  component: PermissionsAdminPage,
  head: () => ({
    meta: [
      {
        title: i18n.t("meta.rbac"),
      },
    ],
  }),
})

function PermissionsAdminPage() {
  return <PermissionsManagement />
}
