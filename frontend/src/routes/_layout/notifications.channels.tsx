import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { NotificationsService } from "@/client"
import AddDingTalkChannel from "@/components/Notifications/AddDingTalkChannel"
import { getNotificationChannelColumns } from "@/components/Notifications/channelColumns"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/notifications/channels")({
  component: NotificationChannelsPage,
  head: () => ({ meta: [{ title: i18n.t("meta.notificationChannels") }] }),
})

function NotificationChannelsContent() {
  const { t } = useTranslation()
  const columns = useMemo(() => getNotificationChannelColumns(t), [t])
  const { data } = useSuspenseQuery({
    queryKey: ["notification-channels"],
    queryFn: () => NotificationsService.readChannels({ limit: 100 }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("notificationChannelsPage.title")}</h1>
          <p className="text-muted-foreground">{t("notificationChannelsPage.subtitle")}</p>
        </div>
        <AddDingTalkChannel />
      </div>
      <DataTable columns={columns} data={data.data} />
    </div>
  )
}

function NotificationChannelsPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <NotificationChannelsContent />
    </Suspense>
  )
}
