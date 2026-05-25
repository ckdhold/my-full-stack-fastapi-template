import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import type { NotificationLogPublic } from "@/client"
import { Badge } from "@/components/ui/badge"

export function getNotificationLogColumns(
  t: TFunction,
): ColumnDef<NotificationLogPublic>[] {
  return [
    {
      accessorKey: "created_at",
      header: t("notificationLogsTable.time"),
      cell: ({ row }) =>
        row.original.created_at
          ? new Date(row.original.created_at).toLocaleString()
          : "—",
    },
    {
      accessorKey: "channel_name",
      header: t("notificationLogsTable.channel"),
    },
    {
      accessorKey: "channel_type",
      header: t("notificationLogsTable.type"),
      cell: ({ row }) =>
        t(`notificationChannels.types.${row.original.channel_type}`, row.original.channel_type),
    },
    {
      accessorKey: "status",
      header: t("notificationLogsTable.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "success" ? "default" : "destructive"}>
          {t(`notificationLogs.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "message",
      header: t("notificationLogsTable.message"),
      cell: ({ row }) => (
        <span className="max-w-[280px] truncate">{row.original.message}</span>
      ),
    },
    {
      accessorKey: "error",
      header: t("notificationLogsTable.error"),
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-destructive">
          {row.original.error || "—"}
        </span>
      ),
    },
  ]
}
