import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Suspense, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import type { MetricSamplePublic } from "@/client"
import { MetricsService, TargetsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/metrics")({
  component: MetricsPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.metrics") }],
  }),
})

function MetricsTable({
  targetId,
  metric,
}: {
  targetId?: string
  metric?: string
}) {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery({
    queryKey: ["metrics", targetId, metric],
    queryFn: () =>
      MetricsService.readMetrics({
        targetId,
        metric: metric || undefined,
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

function MetricsPageContent() {
  const { t } = useTranslation()
  const [targetId, setTargetId] = useState<string>("all")
  const [metric, setMetric] = useState("")

  const { data: targets } = useSuspenseQuery({
    queryKey: ["targets"],
    queryFn: () => TargetsService.readTargets({ limit: 100 }),
  })

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
      </div>

      <Suspense fallback={<PendingItems />}>
        <MetricsTable
          targetId={targetId === "all" ? undefined : targetId}
          metric={metric}
        />
      </Suspense>
    </div>
  )
}

function MetricsPage() {
  return (
    <Suspense fallback={<PendingItems />}>
      <MetricsPageContent />
    </Suspense>
  )
}
