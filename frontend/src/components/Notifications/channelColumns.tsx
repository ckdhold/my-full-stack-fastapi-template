import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import type { NotificationChannelPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import DeleteNotificationChannel from "@/components/Notifications/DeleteNotificationChannel"
import TestNotificationChannel from "@/components/Notifications/TestNotificationChannel"

export function getNotificationChannelColumns(
  t: TFunction,
): ColumnDef<NotificationChannelPublic>[] {
  return [
    {
      accessorKey: "name",
      header: t("notificationChannelsTable.name"),
    },
    {
      accessorKey: "type",
      header: t("notificationChannelsTable.type"),
      cell: ({ row }) => {
        const type = row.original.type
        return t(`notificationChannels.types.${type}`, type)
      },
    },
    {
      accessorKey: "enabled",
      header: t("notificationChannelsTable.enabled"),
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled
            ? t("notificationChannels.enabledYes")
            : t("notificationChannels.enabledNo")}
        </Badge>
      ),
    },
    {
      id: "webhook",
      header: t("notificationChannelsTable.webhook"),
      cell: ({ row }) => {
        const url = row.original.config_json?.webhook_url
        if (typeof url !== "string" || !url) return "—"
        return <span className="max-w-[240px] truncate text-xs">{url}</span>
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <TestNotificationChannel channel={row.original} />
          <DeleteNotificationChannel channel={row.original} />
        </div>
      ),
    },
  ]
}
