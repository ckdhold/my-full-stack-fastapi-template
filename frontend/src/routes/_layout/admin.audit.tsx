import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { AuditLogPublic } from "@/client"
import { AuditService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/admin/audit")({
  component: AuditPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.audit") }],
  }),
})

function AuditTable() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery({
    queryKey: ["audit"],
    queryFn: () => AuditService.readAuditLogs({ limit: 200 }),
  })

  const columns = useMemo<ColumnDef<AuditLogPublic>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: t("auditTable.time"),
        cell: ({ row }) =>
          row.original.created_at
            ? new Date(row.original.created_at).toLocaleString()
            : "-",
      },
      {
        accessorKey: "user_email",
        header: t("auditTable.user"),
        cell: ({ row }) => row.original.user_email || "-",
      },
      { accessorKey: "action", header: t("auditTable.action") },
      { accessorKey: "resource_type", header: t("auditTable.resourceType") },
      { accessorKey: "resource_id", header: t("auditTable.resourceId") },
      { accessorKey: "detail", header: t("auditTable.detail") },
    ],
    [t],
  )

  return <DataTable columns={columns} data={data.data} />
}

function AuditPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("auditPage.title")}</h1>
        <p className="text-muted-foreground">{t("auditPage.subtitle")}</p>
      </div>
      <Suspense fallback={<PendingItems />}>
        <AuditTable />
      </Suspense>
    </div>
  )
}
