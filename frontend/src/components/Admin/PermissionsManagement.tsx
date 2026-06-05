import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  type PermissionPublic,
  RbacService,
  type RoleWithPermissions,
  UsersService,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"

export function PermissionsManagement() {
  const { t } = useTranslation()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const qc = useQueryClient()

  const permissionsQuery = useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: () => RbacService.readRbacPermissions(),
  })
  const rolesQuery = useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: () => RbacService.readRbacRoles(),
  })
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 200 }),
  })

  const [permDialogRole, setPermDialogRole] =
    useState<RoleWithPermissions | null>(null)
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!permDialogRole) {
      setSelectedPermIds(new Set())
      return
    }
    setSelectedPermIds(new Set((permDialogRole.permissions ?? []).map((p) => p.id)))
  }, [permDialogRole])

  const updateRolePerms = useMutation({
    mutationFn: async () => {
      if (!permDialogRole) return
      await RbacService.updateRbacRolePermissions({
        roleId: permDialogRole.id,
        requestBody: { permission_ids: [...selectedPermIds] },
      })
    },
    onSuccess: async () => {
      showSuccessToast(t("rbacPage.toastRolePermissionsUpdated"))
      await qc.invalidateQueries({ queryKey: ["rbac", "roles"] })
      setPermDialogRole(null)
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const [newRoleName, setNewRoleName] = useState("")
  const createRole = useMutation({
    mutationFn: async () => {
      await RbacService.createRbacRole({
        requestBody: { name: newRoleName.trim(), description: null },
      })
    },
    onSuccess: async () => {
      showSuccessToast(t("rbacPage.toastRoleCreated"))
      setNewRoleName("")
      await qc.invalidateQueries({ queryKey: ["rbac", "roles"] })
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      await RbacService.deleteRbacRole({ roleId })
    },
    onSuccess: async () => {
      showSuccessToast(t("rbacPage.toastRoleDeleted"))
      await qc.invalidateQueries({ queryKey: ["rbac", "roles"] })
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const [assignUserId, setAssignUserId] = useState<string>("")
  const userRolesQuery = useQuery({
    queryKey: ["rbac", "user-roles", assignUserId],
    queryFn: () => RbacService.readUserRoles({ userId: assignUserId }),
    enabled: !!assignUserId,
  })
  const [assignRoleIds, setAssignRoleIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userRolesQuery.data) return
    setAssignRoleIds(new Set(userRolesQuery.data.data.map((r) => r.id)))
  }, [userRolesQuery.data])

  const saveUserRoles = useMutation({
    mutationFn: async () => {
      if (!assignUserId) return
      await RbacService.updateUserRoles({
        userId: assignUserId,
        requestBody: { role_ids: [...assignRoleIds] },
      })
    },
    onSuccess: async () => {
      showSuccessToast(t("rbacPage.toastUserRolesUpdated"))
      await qc.invalidateQueries({ queryKey: ["users"] })
      await qc.invalidateQueries({
        queryKey: ["rbac", "user-roles", assignUserId],
      })
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const allPerms: PermissionPublic[] = permissionsQuery.data?.data ?? []
  const roles: RoleWithPermissions[] = rolesQuery.data?.data ?? []

  const togglePerm = (id: string, checked: boolean) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAssignRole = (id: string, checked: boolean) => {
    setAssignRoleIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const userOptions = useMemo(
    () => usersQuery.data?.data ?? [],
    [usersQuery.data],
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("rbacPage.title")}
          </h1>
          <p className="text-muted-foreground">{t("rbacPage.subtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <RouterLink to="/admin">{t("rbacPage.backToUsers")}</RouterLink>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("rbacPage.permissionsTitle")}</CardTitle>
            <CardDescription>{t("rbacPage.permissionsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("rbacPage.columnCode")}</TableHead>
                  <TableHead>{t("rbacPage.columnName")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPerms.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      {p.code}
                    </TableCell>
                    <TableCell>{p.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("rbacPage.rolesTitle")}</CardTitle>
            <CardDescription>{t("rbacPage.rolesHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder={t("rbacPage.newRolePlaceholder")}
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="max-w-xs"
              />
              <Button
                type="button"
                disabled={!newRoleName.trim() || createRole.isPending}
                onClick={() => createRole.mutate()}
              >
                {t("rbacPage.createRole")}
              </Button>
            </div>
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{role.name}</div>
                    {role.description && (
                      <div className="text-muted-foreground text-sm">
                        {role.description}
                      </div>
                    )}
                    <div className="text-muted-foreground mt-1 text-xs">
                      {(role.permissions ?? []).map((p) => p.code).join(", ") ||
                        t("rbacPage.noPermissions")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPermDialogRole(role)}
                    >
                      {t("rbacPage.editPermissions")}
                    </Button>
                    {!role.is_system && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deleteRole.isPending}
                        onClick={() => {
                          if (window.confirm(t("rbacPage.confirmDeleteRole"))) {
                            deleteRole.mutate(role.id)
                          }
                        }}
                      >
                        {t("common.delete")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("rbacPage.assignTitle")}</CardTitle>
          <CardDescription>{t("rbacPage.assignHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="max-w-md space-y-2">
            <Label>{t("rbacPage.selectUser")}</Label>
            <Select
              value={assignUserId || undefined}
              onValueChange={(v) => setAssignUserId(v)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("rbacPage.selectUserPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {assignUserId && (
            <div className="space-y-2">
              <Label>{t("rbacPage.selectRoles")}</Label>
              <div className="flex flex-col gap-2 rounded-md border p-3">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={assignRoleIds.has(role.id)}
                      onCheckedChange={(c) =>
                        toggleAssignRole(role.id, c === true)
                      }
                    />
                    <span>{role.name}</span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                disabled={saveUserRoles.isPending}
                onClick={() => saveUserRoles.mutate()}
              >
                {t("common.save")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!permDialogRole}
        onOpenChange={(o) => !o && setPermDialogRole(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("rbacPage.dialogTitle", { name: permDialogRole?.name ?? "" })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {allPerms.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-start gap-2 text-sm"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={selectedPermIds.has(p.id)}
                  onCheckedChange={(c) => togglePerm(p.id, c === true)}
                />
                <span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.code}
                  </span>
                  <br />
                  {p.name}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogRole(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={updateRolePerms.isPending}
              onClick={() => updateRolePerms.mutate()}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
