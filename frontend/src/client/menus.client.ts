import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type MenuTreePublic = {
  id: string
  parent_id: string | null
  path: string
  title_zh: string
  title_en: string
  icon: string | null
  sort_order: number
  is_active: boolean
  required_permission_code: string | null
  children: MenuTreePublic[]
}

export type MenusTreePublic = {
  data: MenuTreePublic[]
  count: number
}

export type MenuPublic = {
  id: string
  parent_id: string | null
  path: string
  title_zh: string
  title_en: string
  icon: string | null
  sort_order: number
  is_active: boolean
  required_permission_code: string | null
}

export type MenusPublic = {
  data: MenuPublic[]
  count: number
}

export type MenuCreate = {
  parent_id?: string | null
  path: string
  title_zh: string
  title_en: string
  icon?: string | null
  sort_order?: number
  is_active?: boolean
  required_permission_code?: string | null
}

export type MenuUpdate = {
  parent_id?: string | null
  path?: string
  title_zh?: string
  title_en?: string
  icon?: string | null
  sort_order?: number
  is_active?: boolean
  required_permission_code?: string | null
}

import type { RolePublic } from "./types.gen"

export type MenuRoleIds = {
  role_ids: string[]
}

export type MenuRolesPublic = {
  data: RolePublic[]
  count: number
}

export class MenusService {
  public static readMenusMe(): CancelablePromise<MenusTreePublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/menus/me",
      errors: { 422: "Validation Error" },
    })
  }

  public static readMenusAdmin(): CancelablePromise<MenusPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/menus/",
      errors: { 422: "Validation Error" },
    })
  }

  public static createMenu(data: {
    requestBody: MenuCreate
  }): CancelablePromise<MenuPublic> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/menus/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static readMenuRoles(data: {
    menuId: string
  }): CancelablePromise<MenuRolesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/menus/{menu_id}/roles",
      path: { menu_id: data.menuId },
      errors: { 422: "Validation Error" },
    })
  }

  public static updateMenu(data: {
    menuId: string
    requestBody: MenuUpdate
  }): CancelablePromise<MenuPublic> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/menus/{menu_id}",
      path: { menu_id: data.menuId },
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static deleteMenu(data: {
    menuId: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/menus/{menu_id}",
      path: { menu_id: data.menuId },
      errors: { 422: "Validation Error" },
    })
  }

  public static updateMenuRoles(data: {
    menuId: string
    requestBody: MenuRoleIds
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/api/v1/menus/{menu_id}/roles",
      path: { menu_id: data.menuId },
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }
}
