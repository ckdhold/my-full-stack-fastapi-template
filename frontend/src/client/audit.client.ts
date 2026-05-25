import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type AuditLogPublic = {
  id: string
  user_id?: string | null
  user_email?: string | null
  action: string
  resource_type: string
  resource_id?: string | null
  detail?: string | null
  created_at?: string | null
}

export type AuditLogsPublic = {
  data: AuditLogPublic[]
  count: number
}

export class AuditService {
  public static readAuditLogs(data: { skip?: number; limit?: number } = {}): CancelablePromise<AuditLogsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/audit/",
      query: { skip: data.skip, limit: data.limit },
    })
  }
}
