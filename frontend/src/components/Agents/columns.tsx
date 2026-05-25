import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import type { AgentPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { AgentActionsMenu } from "./AgentActionsMenu"

export function getAgentColumns(t: TFunction): ColumnDef<AgentPublic>[] {
  return [
    {
      accessorKey: "name",
      header: t("agentsTable.name"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "host_id",
      header: t("agentsTable.hostId"),
    },
    {
      accessorKey: "status",
      header: t("agentsTable.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "online" ? "default" : "secondary"}>
          {t(`agents.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "version",
      header: t("agentsTable.version"),
      cell: ({ row }) => row.original.version || t("common.na"),
    },
    {
      accessorKey: "last_heartbeat_at",
      header: t("agentsTable.lastHeartbeat"),
      cell: ({ row }) =>
        row.original.last_heartbeat_at
          ? new Date(row.original.last_heartbeat_at).toLocaleString()
          : t("common.na"),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AgentActionsMenu agent={row.original} />
        </div>
      ),
    },
  ]
}
