import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"
import type {
  PermissionsPublic,
  RoleCreate,
  RolePermissionIds,
  RoleUpdate,
  RoleWithPermissions,
  RolesWithPermissionsPublic,
  UserRoleIds,
  UserRolesPublic,
} from "./types.gen"

/** RBAC API client (paths mirror backend `/api/v1/rbac/*`). */
export class RbacService {
  public static readRbacPermissions(): CancelablePromise<PermissionsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/rbac/permissions",
      errors: { 422: "Validation Error" },
    })
  }

  public static readRbacRoles(): CancelablePromise<RolesWithPermissionsPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/rbac/roles",
      errors: { 422: "Validation Error" },
    })
  }

  public static createRbacRole(data: {
    requestBody: RoleCreate
  }): CancelablePromise<RoleWithPermissions> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/rbac/roles",
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static updateRbacRole(data: {
    roleId: string
    requestBody: RoleUpdate
  }): CancelablePromise<RoleWithPermissions> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/rbac/roles/{role_id}",
      path: { role_id: data.roleId },
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static deleteRbacRole(data: {
    roleId: string
  }): CancelablePromise<{ message: string }> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/rbac/roles/{role_id}",
      path: { role_id: data.roleId },
      errors: { 422: "Validation Error" },
    })
  }

  public static updateRbacRolePermissions(data: {
    roleId: string
    requestBody: RolePermissionIds
  }): CancelablePromise<RoleWithPermissions> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/api/v1/rbac/roles/{role_id}/permissions",
      path: { role_id: data.roleId },
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }

  public static readUserRoles(data: {
    userId: string
  }): CancelablePromise<UserRolesPublic> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/rbac/users/{user_id}/roles",
      path: { user_id: data.userId },
      errors: { 422: "Validation Error" },
    })
  }

  public static updateUserRoles(data: {
    userId: string
    requestBody: UserRoleIds
  }): CancelablePromise<UserRolesPublic> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/api/v1/rbac/users/{user_id}/roles",
      path: { user_id: data.userId },
      body: data.requestBody,
      mediaType: "application/json",
      errors: { 422: "Validation Error" },
    })
  }
}
