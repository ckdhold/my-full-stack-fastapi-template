import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import type { AlertPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { AckAlertButton } from "./AckAlertButton"

function severityVariant(severity: string) {
  if (severity === "p0" || severity === "p1") return "destructive" as const
  if (severity === "p2") return "default" as const
  return "secondary" as const
}

export function getAlertColumns(
  t: TFunction,
  options?: { showAck?: boolean },
): ColumnDef<AlertPublic>[] {
  const cols: ColumnDef<AlertPublic>[] = [
    {
      accessorKey: "severity",
      header: t("alertsTable.severity"),
      cell: ({ row }) => (
        <Badge variant={severityVariant(row.original.severity)}>
          {row.original.severity.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "target_name",
      header: t("alertsTable.target"),
      cell: ({ row }) => row.original.target_name || row.original.target_id,
    },
    {
      accessorKey: "rule_name",
      header: t("alertsTable.rule"),
      cell: ({ row }) => row.original.rule_name || "—",
    },
    {
      accessorKey: "message",
      header: t("alertsTable.message"),
      cell: ({ row }) => (
        <span className="max-w-md truncate block">{row.original.message}</span>
      ),
    },
    {
      accessorKey: "current_value",
      header: t("alertsTable.value"),
      cell: ({ row }) =>
        row.original.current_value != null
          ? row.original.current_value.toFixed(2)
          : t("common.na"),
    },
    {
      accessorKey: "fired_at",
      header: t("alertsTable.firedAt"),
      cell: ({ row }) => new Date(row.original.fired_at).toLocaleString(),
    },
    {
      accessorKey: "status",
      header: t("alertsTable.status"),
      cell: ({ row }) => t(`alerts.status.${row.original.status}`),
    },
  ]

  if (options?.showAck) {
    cols.push({
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      cell: ({ row }) =>
        row.original.status === "firing" ? (
          <AckAlertButton alertId={row.original.id} />
        ) : null,
    })
  }

  return cols
}

export const ALERT_OPERATORS = ["gt", "gte", "lt", "lte", "eq"] as const
export const ALERT_SEVERITIES = ["p0", "p1", "p2", "p3"] as const
