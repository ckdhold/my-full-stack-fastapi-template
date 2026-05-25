import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type NotificationChannelPublic = {
  id: string
  name: string
  type: string
  enabled: boolean
  config_json: Record<string, unknown>
  created_at?: string | null
  updated_at?: string | null
}

export type NotificationChannelsPublic = {
  data: NotificationChannelPublic[]
  count: number
}

export type NotificationChannelCreate = {
  name: string
  type: string
  enabled?: boolean
  config_json?: Record<string, unknown>
}

export type NotificationChannelUpdate = Partial<NotificationChannelCreate>

export type NotificationPolicyPublic = {
  id: string
  severity: string
  channel_id: string
  enabled: boolean
  created_at?: string | null
  channel_name?: string | null
  channel_type?: string | null
}

export type NotificationPoliciesPublic = {
  data: NotificationPolicyPublic[]
  count: number
}

export type NotificationPolicyCreate = {
  severity: string
  channel_id: string
  enabled?: boolean
}

export type NotificationPolicyUpdate = Partial<NotificationPolicyCreate>

export type NotificationLogPublic = {
  id: string
  alert_id?: string | null
  channel_id?: string | null
  channel_type: string
  channel_name: string
  status: string
  message: string
  error?: string | null
  created_at?: string | null
}

export type NotificationLogsPublic = {
  data: NotificationLogPublic[]
  count: number
}

export const NOTIFICATION_CHANNEL_TYPES = ["email", "dingtalk"] as const
export const NOTIFICATION_SEVERITIES = ["p0", "p1", "p2", "p3"] as const

export class NotificationsService {
  public static readChannels(data: {
    skip?: number
    limit?: number
  } = {}): CancelablePromise<NotificationChannelsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/notifications/channels/",
      query: { skip: data.skip, limit: data.limit },
    })
  }

  public static createChannel(data: {
    requestBody: NotificationChannelCreate
  }): CancelablePromise<NotificationChannelPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/notifications/channels/",
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static updateChannel(data: {
    id: string
    requestBody: NotificationChannelUpdate
  }): CancelablePromise<NotificationChannelPublic> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/api/v1/notifications/channels/{id}",
      path: { id: data.id },
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static deleteChannel(data: {
    id: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/notifications/channels/{id}",
      path: { id: data.id },
    })
  }

  public static testChannel(data: {
    id: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/notifications/channels/{id}/test",
      path: { id: data.id },
    })
  }

  public static readPolicies(data: {
    skip?: number
    limit?: number
  } = {}): CancelablePromise<NotificationPoliciesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/notifications/policies/",
      query: { skip: data.skip, limit: data.limit },
    })
  }

  public static createPolicy(data: {
    requestBody: NotificationPolicyCreate
  }): CancelablePromise<NotificationPolicyPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/notifications/policies/",
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static deletePolicy(data: {
    id: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/notifications/policies/{id}",
      path: { id: data.id },
    })
  }

  public static readLogs(data: {
    skip?: number
    limit?: number
  } = {}): CancelablePromise<NotificationLogsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/notifications/logs/",
      query: { skip: data.skip, limit: data.limit },
    })
  }
}
