import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type EventPublic = {
  id: string
  type: string
  message: string
  target_id?: string | null
  alert_id?: string | null
  meta_json: Record<string, unknown>
  created_at?: string | null
  target_name?: string | null
}

export type EventsPublic = {
  data: EventPublic[]
  count: number
}

export class EventsService {
  public static readEvents(data: {
    type?: string
    targetId?: string
    since?: string
    until?: string
    skip?: number
    limit?: number
  } = {}): CancelablePromise<EventsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/events/",
      query: {
        type: data.type,
        target_id: data.targetId,
        since: data.since,
        until: data.until,
        skip: data.skip,
        limit: data.limit,
      },
    })
  }
}
