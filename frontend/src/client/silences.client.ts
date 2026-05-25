import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type SilencePublic = {
  id: string
  target_id?: string | null
  reason: string
  starts_at: string
  ends_at: string
  created_by?: string | null
  created_at?: string | null
  target_name?: string | null
}

export type SilenceCreate = {
  target_id?: string | null
  reason: string
  starts_at: string
  ends_at: string
}

export type SilencesPublic = {
  data: SilencePublic[]
  count: number
}

export class SilencesService {
  public static readSilences(data: {
    activeOnly?: boolean
    skip?: number
    limit?: number
  } = {}): CancelablePromise<SilencesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/alerts/silences/",
      query: {
        active_only: data.activeOnly,
        skip: data.skip,
        limit: data.limit,
      },
    })
  }

  public static createSilence(data: { requestBody: SilenceCreate }): CancelablePromise<{ id: string; message: string }> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/alerts/silences/",
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static deleteSilence(data: { id: string }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/alerts/silences/{id}",
      path: { id: data.id },
    })
  }
}
