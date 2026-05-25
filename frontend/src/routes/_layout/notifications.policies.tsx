import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { NotificationsService } from "@/client"
import AddNotificationPolicy from "@/components/Notifications/AddNotificationPolicy"
import { getNotificationPolicyColumns } from "@/components/Notifications/policyColumns"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/notifications/policies")({
  component: NotificationPoliciesPage,
  head: () => ({ meta: [{ title: i18n.t("meta.notificationPolicies") }] }),
})

function NotificationPoliciesContent() {
  const { t } = useTranslation()
  const columns = useMemo(() => getNotificationPolicyColumns(t), [t])
  const { data } = useSuspenseQuery({
    queryKey: ["notification-policies"],
    queryFn: () => NotificationsService.readPolicies({ limit: 100 }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("notificationPoliciesPage.title")}</h1>
          <p className="text-muted-foreground">{t("notificationPoliciesPage.subtitle")}</p>
        </div>
        <Suspense fallback={null}>
          <AddNotificationPolicy />
        </Suspense>
      </div>
      <DataTable columns={columns} data={data.data} />
    </div>
  )
}

function NotificationPoliciesPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <NotificationPoliciesContent />
    </Suspense>
  )
}
