import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AlertsService } from "@/client"
import { getAlertColumns } from "@/components/Alerts/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/alerts/history")({
  component: AlertHistoryPage,
  head: () => ({ meta: [{ title: i18n.t("meta.alertHistory") }] }),
})

function AlertHistoryPageContent() {
  const { t } = useTranslation()
  const columns = useMemo(() => getAlertColumns(t), [t])
  const { data } = useSuspenseQuery({
    queryKey: ["alerts", "resolved"],
    queryFn: () => AlertsService.readAlerts({ status: "resolved", limit: 100 }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("alertsPage.historyTitle")}</h1>
        <p className="text-muted-foreground">{t("alertsPage.historySubtitle")}</p>
      </div>
      <DataTable columns={columns} data={data.data} />
    </div>
  )
}

function AlertHistoryPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <AlertHistoryPageContent />
    </Suspense>
  )
}
