import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type AlertPublic = {
  id: string
  rule_id: string
  target_id: string
  status: string
  severity: string
  message: string
  current_value?: number | null
  fired_at: string
  acknowledged_at?: string | null
  acknowledged_by?: string | null
  ack_note?: string | null
  resolved_at?: string | null
  rule_name?: string | null
  target_name?: string | null
}

export type AlertsPublic = {
  data: AlertPublic[]
  count: number
}

export type AlertSummary = {
  firing: number
  acknowledged: number
  resolved: number
}

export type AlertAck = {
  note?: string | null
}

export type AlertRulePublic = {
  id: string
  name: string
  target_id: string
  metric: string
  operator: string
  threshold: number
  duration_sec: number
  severity: string
  enabled: boolean
  no_data_sec?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type AlertRulesPublic = {
  data: AlertRulePublic[]
  count: number
}

export type AlertRuleCreate = {
  name: string
  target_id: string
  metric: string
  operator: string
  threshold: number
  duration_sec?: number
  severity?: string
  enabled?: boolean
  no_data_sec?: number | null
}

export type AlertRuleUpdate = Partial<AlertRuleCreate>

export class AlertsService {
  public static readAlertsSummary(): CancelablePromise<AlertSummary> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/alerts/summary",
    })
  }

  public static readAlerts(data: {
    status?: string
    skip?: number
    limit?: number
  } = {}): CancelablePromise<AlertsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/alerts/",
      query: {
        status: data.status,
        skip: data.skip,
        limit: data.limit,
      },
    })
  }

  public static ackAlert(data: {
    id: string
    requestBody: AlertAck
  }): CancelablePromise<AlertPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/alerts/{id}/ack",
      path: { id: data.id },
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static readAlertRules(data: {
    skip?: number
    limit?: number
  } = {}): CancelablePromise<AlertRulesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/alerts/rules/",
      query: { skip: data.skip, limit: data.limit },
    })
  }

  public static createAlertRule(data: {
    requestBody: AlertRuleCreate
  }): CancelablePromise<AlertRulePublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/alerts/rules/",
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static deleteAlertRule(data: {
    id: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/alerts/rules/{id}",
      path: { id: data.id },
    })
  }
}
