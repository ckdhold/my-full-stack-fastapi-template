import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type ApiTokenPublic = {
  id: string
  name: string
  target_id: string
  enabled: boolean
  token_prefix: string
  created_at?: string | null
  target_name?: string | null
}

export type ApiTokenCreate = {
  name: string
  target_id: string
}

export type ApiTokenCreatedPublic = ApiTokenPublic & {
  token: string
}

export type ApiTokensPublic = {
  data: ApiTokenPublic[]
  count: number
}

export class TokensService {
  public static readTokens(data: { skip?: number; limit?: number } = {}): CancelablePromise<ApiTokensPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/tokens/",
      query: { skip: data.skip, limit: data.limit },
    })
  }

  public static createToken(data: { requestBody: ApiTokenCreate }): CancelablePromise<ApiTokenCreatedPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/tokens/",
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static deleteToken(data: { id: string }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/tokens/{id}",
      path: { id: data.id },
    })
  }
}
