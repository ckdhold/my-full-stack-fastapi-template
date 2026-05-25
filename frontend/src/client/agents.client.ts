import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type AgentPublic = {
  id: string
  name: string
  host_id: string
  target_id?: string | null
  version?: string | null
  status: string
  last_heartbeat_at?: string | null
  created_at?: string | null
}

export type AgentsPublic = {
  data: AgentPublic[]
  count: number
}

export type AgentCreate = {
  name: string
  host_id: string
}

export type AgentCreatedPublic = {
  agent: AgentPublic
  token: string
}

export class AgentsService {
  public static readAgents(data: {
    skip?: number
    limit?: number
  } = {}): CancelablePromise<AgentsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/agents/",
      query: { skip: data.skip, limit: data.limit },
      errors: { 422: "Validation Error" },
    })
  }

  public static createAgent(data: {
    requestBody: AgentCreate
  }): CancelablePromise<AgentCreatedPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/agents/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static deleteAgent(data: {
    id: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/agents/{id}",
      path: { id: data.id },
      errors: { 422: "Validation Error" },
    })
  }
}
