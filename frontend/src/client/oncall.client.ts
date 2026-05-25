import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type OncallContactPublic = {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string | null
  sort_order: number
  created_at?: string | null
}

export type OncallContactCreate = {
  name: string
  email: string
  phone?: string | null
  role?: string | null
  sort_order?: number
}

export type OncallContactsPublic = {
  data: OncallContactPublic[]
  count: number
}

export class OncallService {
  public static readContacts(): CancelablePromise<OncallContactsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/notifications/oncall/",
    })
  }

  public static createContact(data: { requestBody: OncallContactCreate }): CancelablePromise<OncallContactPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/notifications/oncall/",
      body: data.requestBody,
      mediaType: "application/json",
    })
  }

  public static deleteContact(data: { id: string }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/notifications/oncall/{id}",
      path: { id: data.id },
    })
  }
}
