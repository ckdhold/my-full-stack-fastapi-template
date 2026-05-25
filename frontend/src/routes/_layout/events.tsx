import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { EventsService } from "@/client"
import PendingItems from "@/components/Pending/PendingItems"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/events")({
  component: EventsPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.events") }],
  }),
})

function EventsList() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery({
    queryKey: ["events"],
    queryFn: () => EventsService.readEvents({ limit: 100 }),
  })

  if (data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("eventsPage.empty")}</p>
  }

  return (
    <div className="space-y-3">
      {data.data.map((event) => (
        <div
          key={event.id}
          className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{event.type}</Badge>
              {event.target_name ? (
                <span className="text-sm text-muted-foreground">{event.target_name}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm">{event.message}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {event.created_at ? new Date(event.created_at).toLocaleString() : "-"}
          </span>
        </div>
      ))}
    </div>
  )
}

function EventsPageContent() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("eventsPage.title")}</h1>
        <p className="text-muted-foreground">{t("eventsPage.subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("eventsPage.timeline")}</CardTitle>
          <CardDescription>{t("eventsPage.timelineHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PendingItems />}>
            <EventsList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function EventsPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <EventsPageContent />
    </Suspense>
  )
}
