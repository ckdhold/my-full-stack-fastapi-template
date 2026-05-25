import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { NotificationsService } from "@/client"
import { getNotificationLogColumns } from "@/components/Notifications/logColumns"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/notifications/logs")({
  component: NotificationLogsPage,
  head: () => ({ meta: [{ title: i18n.t("meta.notificationLogs") }] }),
})

function NotificationLogsContent() {
  const { t } = useTranslation()
  const columns = useMemo(() => getNotificationLogColumns(t), [t])
  const { data } = useSuspenseQuery({
    queryKey: ["notification-logs"],
    queryFn: () => NotificationsService.readLogs({ limit: 100 }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("notificationLogsPage.title")}</h1>
        <p className="text-muted-foreground">{t("notificationLogsPage.subtitle")}</p>
      </div>
      <DataTable columns={columns} data={data.data} />
    </div>
  )
}

function NotificationLogsPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <NotificationLogsContent />
    </Suspense>
  )
}
