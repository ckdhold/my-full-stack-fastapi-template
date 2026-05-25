import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import type { NotificationPolicyPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import DeleteNotificationPolicy from "@/components/Notifications/DeleteNotificationPolicy"

export function getNotificationPolicyColumns(
  t: TFunction,
): ColumnDef<NotificationPolicyPublic>[] {
  return [
    {
      accessorKey: "severity",
      header: t("notificationPoliciesTable.severity"),
      cell: ({ row }) => row.original.severity.toUpperCase(),
    },
    {
      accessorKey: "channel_name",
      header: t("notificationPoliciesTable.channel"),
    },
    {
      accessorKey: "channel_type",
      header: t("notificationPoliciesTable.channelType"),
      cell: ({ row }) => {
        const type = row.original.channel_type
        if (!type) return "—"
        return t(`notificationChannels.types.${type}`, type)
      },
    },
    {
      accessorKey: "enabled",
      header: t("notificationPoliciesTable.enabled"),
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled
            ? t("notificationChannels.enabledYes")
            : t("notificationChannels.enabledNo")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => <DeleteNotificationPolicy policy={row.original} />,
    },
  ]
}
