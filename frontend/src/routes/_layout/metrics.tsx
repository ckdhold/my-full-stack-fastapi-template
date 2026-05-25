import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useState } from "react"
import { useTranslation } from "react-i18next"

import { MetricsService, TargetsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { getSinceIso, MetricChart } from "@/components/Metrics/MetricChart"
import PendingItems from "@/components/Pending/PendingItems"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import i18n from "@/i18n"
import type { ColumnDef } from "@tanstack/react-table"
import type { MetricSamplePublic } from "@/client"
import { useMemo } from "react"

export const Route = createFileRoute("/_layout/metrics")({
  component: MetricsPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.metrics") }],
  }),
})

function MetricsTable({
  targetId,
  metric,
  since,
}: {
  targetId?: string
  metric?: string
  since: string
}) {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery({
    queryKey: ["metrics", targetId, metric, since],
    queryFn: () =>
      MetricsService.readMetrics({
        targetId,
        metric: metric || undefined,
        since,
        limit: 200,
      }),
  })

  const columns = useMemo<ColumnDef<MetricSamplePublic>[]>(
    () => [
      {
        accessorKey: "ts",
        header: t("metricsTable.time"),
        cell: ({ row }) => new Date(row.original.ts).toLocaleString(),
      },
      { accessorKey: "metric", header: t("metricsTable.metric") },
      {
        accessorKey: "value",
        header: t("metricsTable.value"),
        cell: ({ row }) => row.original.value.toFixed(2),
      },
      {
        accessorKey: "target_id",
        header: t("metricsTable.target"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.target_id}</span>
        ),
      },
    ],
    [t],
  )

  return <DataTable columns={columns} data={data.data} />
}

function MetricsExplorer() {
  const { t } = useTranslation()
  const [targetId, setTargetId] = useState<string>("all")
  const [metric, setMetric] = useState("")
  const [rangeHours, setRangeHours] = useState("24")
  const since = getSinceIso(Number(rangeHours))

  const { data: targets } = useSuspenseQuery({
    queryKey: ["targets"],
    queryFn: () => TargetsService.readTargets({ limit: 100 }),
  })

  const selectedTargetId = targetId === "all" ? undefined : targetId

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("metricsPage.title")}</h1>
        <p className="text-muted-foreground">{t("metricsPage.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={targetId} onValueChange={setTargetId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder={t("metricsPage.selectTarget")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("metricsPage.allTargets")}</SelectItem>
            {targets.data.map((target) => (
              <SelectItem key={target.id} value={target.id}>
                {target.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="w-[280px]"
          placeholder={t("metricsPage.metricFilter")}
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        />
        <Select value={rangeHours} onValueChange={setRangeHours}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("metricsPage.range1h")}</SelectItem>
            <SelectItem value="6">{t("metricsPage.range6h")}</SelectItem>
            <SelectItem value="24">{t("metricsPage.range24h")}</SelectItem>
            <SelectItem value="168">{t("metricsPage.range7d")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">{t("metricsPage.chartTab")}</TabsTrigger>
          <TabsTrigger value="table">{t("metricsPage.tableTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="mt-4">
          <Suspense fallback={<PendingItems />}>
            <MetricChart
              targetId={selectedTargetId}
              metric={metric || undefined}
              since={since}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <Suspense fallback={<PendingItems />}>
            <MetricsTable
              targetId={selectedTargetId}
              metric={metric}
              since={since}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricsPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <MetricsExplorer />
    </Suspense>
  )
}
