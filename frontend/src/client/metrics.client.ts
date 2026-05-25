import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type MetricSamplePublic = {
  id: string
  target_id: string
  metric: string
  value: number
  labels: Record<string, string>
  ts: string
}

export type MetricSamplesPublic = {
  data: MetricSamplePublic[]
  count: number
}

export class MetricsService {
  public static readMetrics(data: {
    targetId?: string
    metric?: string
    skip?: number
    limit?: number
  } = {}): CancelablePromise<MetricSamplesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/metrics/",
      query: {
        target_id: data.targetId,
        metric: data.metric,
        skip: data.skip,
        limit: data.limit,
      },
      errors: { 422: "Validation Error" },
    })
  }
}
