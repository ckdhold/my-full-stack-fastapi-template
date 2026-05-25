import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import type { AlertRulePublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { DeleteAlertRule } from "./DeleteAlertRule"

export function getAlertRuleColumns(t: TFunction): ColumnDef<AlertRulePublic>[] {
  return [
    { accessorKey: "name", header: t("alertRulesTable.name") },
    {
      accessorKey: "metric",
      header: t("alertRulesTable.metric"),
    },
    {
      id: "condition",
      header: t("alertRulesTable.condition"),
      cell: ({ row }) =>
        `${row.original.operator} ${row.original.threshold}`,
    },
    {
      accessorKey: "severity",
      header: t("alertRulesTable.severity"),
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.severity.toUpperCase()}</Badge>
      ),
    },
    {
      accessorKey: "enabled",
      header: t("alertRulesTable.enabled"),
      cell: ({ row }) =>
        row.original.enabled ? t("alertRules.enabledYes") : t("alertRules.enabledNo"),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      cell: ({ row }) => <DeleteAlertRule id={row.original.id} />,
    },
  ]
}
