import { useSuspenseQuery } from "@tanstack/react-query"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { MetricSamplePublic } from "@/client"
import { MetricsService } from "@/client"

function toChartData(samples: MetricSamplePublic[]) {
  return [...samples]
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .map((sample) => ({
      ts: new Date(sample.ts).toLocaleString(),
      value: sample.value,
    }))
}

type MetricChartProps = {
  targetId?: string
  metric?: string
  since?: string
  until?: string
  limit?: number
  height?: number
}

export function MetricChart({
  targetId,
  metric,
  since,
  until,
  limit = 200,
  height = 280,
}: MetricChartProps) {
  const { data } = useSuspenseQuery({
    queryKey: ["metrics-chart", targetId, metric, since, until, limit],
    queryFn: () =>
      MetricsService.readMetrics({
        targetId,
        metric,
        since,
        until,
        limit,
      }),
  })

  const chartData = toChartData(data.data)

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="ts" hide={chartData.length > 20} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            dot={chartData.length <= 30}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function getSinceIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}
