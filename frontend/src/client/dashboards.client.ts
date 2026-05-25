import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type DashboardPanel = {
  id: string
  title_zh: string
  title_en: string
  metric: string
  target_type?: string
  chart: string
}

export type DashboardPublic = {
  id: string
  slug: string
  title_zh: string
  title_en: string
  description_zh?: string | null
  description_en?: string | null
  panels_json: DashboardPanel[]
  sort_order: number
  created_at?: string | null
}

export type DashboardsPublic = {
  data: DashboardPublic[]
  count: number
}

export class DashboardsService {
  public static readDashboards(): CancelablePromise<DashboardsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/dashboards/",
    })
  }

  public static readDashboard(data: { slug: string }): CancelablePromise<DashboardPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/dashboards/{slug}",
      path: { slug: data.slug },
    })
  }
}
