import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { DashboardsService, TargetsService } from "@/client"
import { getSinceIso, MetricChart } from "@/components/Metrics/MetricChart"
import PendingItems from "@/components/Pending/PendingItems"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { resolveMenuTitle } from "@/utils/menuTitle"

export const Route = createFileRoute("/_layout/dashboards/$slug")({
  component: DashboardDetailPage,
})

function DashboardPanels({ slug }: { slug: string }) {
  const { i18n: i18nInstance } = useTranslation()
  const since = getSinceIso(24)
  const { data: dashboard } = useSuspenseQuery({
    queryKey: ["dashboard", slug],
    queryFn: () => DashboardsService.readDashboard({ slug }),
  })
  const { data: targets } = useSuspenseQuery({
    queryKey: ["targets"],
    queryFn: () => TargetsService.readTargets({ limit: 200 }),
  })

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {dashboard.panels_json.map((panel) => {
        const title = i18nInstance.language.startsWith("zh")
          ? panel.title_zh
          : panel.title_en
        const matchedTarget = panel.target_type
          ? targets.data.find((target) => target.type === panel.target_type)
          : targets.data[0]

        return (
          <Card key={panel.id}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<PendingItems />}>
                <MetricChart
                  targetId={matchedTarget?.id}
                  metric={panel.metric}
                  since={since}
                  height={240}
                />
              </Suspense>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function DashboardDetailPage() {
  const { slug } = Route.useParams()
  const { i18n: i18nInstance } = useTranslation()
  const { data: dashboard } = useSuspenseQuery({
    queryKey: ["dashboard", slug],
    queryFn: () => DashboardsService.readDashboard({ slug }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {resolveMenuTitle(
            { title_zh: dashboard.title_zh, title_en: dashboard.title_en },
            i18nInstance.language,
          )}
        </h1>
        <p className="text-muted-foreground">
          {i18nInstance.language.startsWith("zh")
            ? dashboard.description_zh
            : dashboard.description_en}
        </p>
      </div>
      <Suspense fallback={<PendingItems />}>
        <DashboardPanels slug={slug} />
      </Suspense>
    </div>
  )
}
