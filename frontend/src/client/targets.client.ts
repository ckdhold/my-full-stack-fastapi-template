import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type TargetPublic = {
  id: string
  name: string
  type: string
  status: string
  labels: Record<string, string>
  config_json: Record<string, unknown>
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type TargetsPublic = {
  data: TargetPublic[]
  count: number
}

export type TargetSummary = {
  total: number
  online: number
  offline: number
  alert: number
  unknown: number
}

export type TargetCreate = {
  name: string
  type: string
  labels?: Record<string, string>
  config_json?: Record<string, unknown>
  description?: string | null
  status?: string | null
}

export type TargetUpdate = {
  name?: string | null
  type?: string | null
  status?: string | null
  labels?: Record<string, string> | null
  config_json?: Record<string, unknown> | null
  description?: string | null
}

/** Monitoring targets API client (`/api/v1/targets/*`). */
export class TargetsService {
  public static readTargetsSummary(): CancelablePromise<TargetSummary> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/targets/summary",
      errors: { 422: "Validation Error" },
    })
  }

  public static readTargets(data: {
    skip?: number
    limit?: number
    type?: string
    status?: string
    search?: string
  } = {}): CancelablePromise<TargetsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/targets/",
      query: {
        skip: data.skip,
        limit: data.limit,
        type: data.type,
        status: data.status,
        search: data.search,
      },
      errors: { 422: "Validation Error" },
    })
  }

  public static readTarget(data: { id: string }): CancelablePromise<TargetPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/targets/{id}",
      path: { id: data.id },
      errors: { 422: "Validation Error" },
    })
  }

  public static createTarget(data: {
    requestBody: TargetCreate
  }): CancelablePromise<TargetPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/targets/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static updateTarget(data: {
    id: string
    requestBody: TargetUpdate
  }): CancelablePromise<TargetPublic> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/api/v1/targets/{id}",
      path: { id: data.id },
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static deleteTarget(data: {
    id: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/targets/{id}",
      path: { id: data.id },
      errors: { 422: "Validation Error" },
    })
  }
}
