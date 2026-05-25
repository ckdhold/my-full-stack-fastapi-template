import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AlertsService } from "@/client"
import { getAlertColumns } from "@/components/Alerts/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/alerts/active")({
  component: ActiveAlertsRoute,
  head: () => ({ meta: [{ title: i18n.t("meta.alertsActive") }] }),
})

function ActiveAlertsPage() {
  const { t } = useTranslation()
  const columns = useMemo(() => getAlertColumns(t, { showAck: true }), [t])
  const { data: firing } = useSuspenseQuery({
    queryKey: ["alerts", "firing"],
    queryFn: () => AlertsService.readAlerts({ status: "firing", limit: 100 }),
  })
  const { data: acked } = useSuspenseQuery({
    queryKey: ["alerts", "acknowledged"],
    queryFn: () =>
      AlertsService.readAlerts({ status: "acknowledged", limit: 100 }),
  })
  const rows = [...firing.data, ...acked.data]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("alertsPage.activeTitle")}</h1>
        <p className="text-muted-foreground">{t("alertsPage.activeSubtitle")}</p>
      </div>
      <DataTable columns={columns} data={rows} />
    </div>
  )
}

function ActiveAlertsRoute() {
  return (
    <Suspense fallback={<PendingItems />}>
      <ActiveAlertsPage />
    </Suspense>
  )
}
