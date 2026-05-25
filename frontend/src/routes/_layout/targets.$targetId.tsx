import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { AlertsService, EventsService, TargetsService } from "@/client"
import { getAlertColumns } from "@/components/Alerts/columns"
import { DataTable } from "@/components/Common/DataTable"
import { getSinceIso, MetricChart } from "@/components/Metrics/MetricChart"
import PendingItems from "@/components/Pending/PendingItems"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/targets/$targetId")({
  component: TargetDetailPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.targetDetail") }],
  }),
})

function TargetEvents({ targetId }: { targetId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ["events", targetId],
    queryFn: () => EventsService.readEvents({ targetId, limit: 10 }),
  })

  if (data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">-</p>
  }

  return (
    <ul className="space-y-2 text-sm">
      {data.data.map((event) => (
        <li key={event.id} className="flex justify-between gap-4 border-b pb-2 last:border-0">
          <span>{event.message}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {event.created_at ? new Date(event.created_at).toLocaleString() : "-"}
          </span>
        </li>
      ))}
    </ul>
  )
}

function TargetAlerts({ targetId }: { targetId: string }) {
  const { t } = useTranslation()
  const columns = getAlertColumns(t, { showAck: false })
  const { data } = useSuspenseQuery({
    queryKey: ["alerts", targetId],
    queryFn: () => AlertsService.readAlerts({ limit: 20 }),
  })
  const filtered = data.data.filter((alert) => alert.target_id === targetId).slice(0, 5)
  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">-</p>
  }
  return <DataTable columns={columns} data={filtered} />
}

function TargetDetailContent() {
  const { targetId } = Route.useParams()
  const { t } = useTranslation()
  const since = getSinceIso(24)
  const { data: target } = useSuspenseQuery({
    queryKey: ["target", targetId],
    queryFn: () => TargetsService.readTarget({ id: targetId }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{target.name}</h1>
          <p className="text-muted-foreground">{target.description || t("targets.noDescription")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{t(`targets.type.${target.type}`, target.type)}</Badge>
            <Badge>{t(`targets.status.${target.status}`, target.status)}</Badge>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/targets">{t("targetDetail.back")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("targetDetail.metrics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PendingItems />}>
            <MetricChart targetId={targetId} since={since} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("targetDetail.alerts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<PendingItems />}>
              <TargetAlerts targetId={targetId} />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("targetDetail.events")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<PendingItems />}>
              <TargetEvents targetId={targetId} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TargetDetailPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <TargetDetailContent />
    </Suspense>
  )
}
