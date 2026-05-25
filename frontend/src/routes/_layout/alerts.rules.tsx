import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AlertsService } from "@/client"
import AddAlertRule from "@/components/Alerts/AddAlertRule"
import { getAlertRuleColumns } from "@/components/Alerts/ruleColumns"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/alerts/rules")({
  component: AlertRulesPage,
  head: () => ({ meta: [{ title: i18n.t("meta.alertRules") }] }),
})

function AlertRulesPageContent() {
  const { t } = useTranslation()
  const columns = useMemo(() => getAlertRuleColumns(t), [t])
  const { data } = useSuspenseQuery({
    queryKey: ["alert-rules"],
    queryFn: () => AlertsService.readAlertRules({ limit: 100 }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("alertRulesPage.title")}</h1>
          <p className="text-muted-foreground">{t("alertRulesPage.subtitle")}</p>
        </div>
        <AddAlertRule />
      </div>
      <DataTable columns={columns} data={data.data} />
    </div>
  )
}

function AlertRulesPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <AlertRulesPageContent />
    </Suspense>
  )
}
