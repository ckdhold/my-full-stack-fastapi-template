import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  type MenuPublic,
  MenusService,
  RbacService,
  type RoleWithPermissions,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"

export function MenuManagement() {
  const { t } = useTranslation()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const qc = useQueryClient()

  const menusQuery = useQuery({
    queryKey: ["menus", "admin"],
    queryFn: () => MenusService.readMenusAdmin(),
  })
  const rolesQuery = useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: () => RbacService.readRbacRoles(),
  })

  const [roleDialogMenu, setRoleDialogMenu] = useState<MenuPublic | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set())

  const menuRolesQuery = useQuery({
    queryKey: ["menus", "roles", roleDialogMenu?.id],
    queryFn: () => MenusService.readMenuRoles({ menuId: roleDialogMenu!.id }),
    enabled: !!roleDialogMenu,
  })

  useEffect(() => {
    if (!roleDialogMenu) {
      setSelectedRoleIds(new Set())
      return
    }
    const data = menuRolesQuery.data?.data
    if (data) setSelectedRoleIds(new Set(data.map((r) => r.id)))
  }, [roleDialogMenu, menuRolesQuery.data])

  const updateMenuRoles = useMutation({
    mutationFn: async () => {
      if (!roleDialogMenu) return
      await MenusService.updateMenuRoles({
        menuId: roleDialogMenu.id,
        requestBody: { role_ids: [...selectedRoleIds] },
      })
    },
    onSuccess: async () => {
      showSuccessToast(t("menusPage.toastRolesUpdated"))
      await qc.invalidateQueries({ queryKey: ["menus"] })
      setRoleDialogMenu(null)
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const [newPath, setNewPath] = useState("")
  const [newTitleKey, setNewTitleKey] = useState("")
  const [newIcon, setNewIcon] = useState("")
  const createMenu = useMutation({
    mutationFn: async () => {
      await MenusService.createMenu({
        requestBody: {
          path: newPath.trim(),
          title_key: newTitleKey.trim(),
          icon: newIcon.trim() || null,
          sort_order: 100,
          is_active: true,
        },
      })
    },
    onSuccess: async () => {
      showSuccessToast(t("menusPage.toastCreated"))
      setNewPath("")
      setNewTitleKey("")
      setNewIcon("")
      await qc.invalidateQueries({ queryKey: ["menus"] })
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const deleteMenu = useMutation({
    mutationFn: async (menuId: string) => {
      await MenusService.deleteMenu({ menuId })
    },
    onSuccess: async () => {
      showSuccessToast(t("menusPage.toastDeleted"))
      await qc.invalidateQueries({ queryKey: ["menus"] })
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const roles: RoleWithPermissions[] = rolesQuery.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("menusPage.createTitle")}</CardTitle>
          <CardDescription>{t("menusPage.createHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="menu-path">{t("menusPage.path")}</Label>
            <Input
              id="menu-path"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/example"
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label htmlFor="menu-title-key">{t("menusPage.titleKey")}</Label>
            <Input
              id="menu-title-key"
              value={newTitleKey}
              onChange={(e) => setNewTitleKey(e.target.value)}
              placeholder="nav.example"
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label htmlFor="menu-icon">{t("menusPage.icon")}</Label>
            <Input
              id="menu-icon"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="LayoutDashboard"
            />
          </div>
          <Button
            type="button"
            onClick={() => createMenu.mutate()}
            disabled={
              createMenu.isPending || !newPath.trim() || !newTitleKey.trim()
            }
          >
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("menusPage.listTitle")}</CardTitle>
          <CardDescription>{t("menusPage.listHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("menusPage.path")}</TableHead>
                <TableHead>{t("menusPage.titleKey")}</TableHead>
                <TableHead>{t("menusPage.icon")}</TableHead>
                <TableHead>{t("menusPage.sort")}</TableHead>
                <TableHead className="text-end">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(menusQuery.data?.data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{m.path}</TableCell>
                  <TableCell>{m.title_key}</TableCell>
                  <TableCell>{m.icon ?? "—"}</TableCell>
                  <TableCell>{m.sort_order}</TableCell>
                  <TableCell className="text-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRoleDialogMenu(m)}
                    >
                      {t("menusPage.roles")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(t("menusPage.confirmDelete"))) {
                          deleteMenu.mutate(m.id)
                        }
                      }}
                    >
                      {t("common.delete")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!roleDialogMenu}
        onOpenChange={(o) => !o && setRoleDialogMenu(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("menusPage.rolesDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 space-y-3 overflow-y-auto py-2">
            {roles.map((r) => (
              <label
                key={r.id}
                htmlFor={`menu-role-${r.id}`}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  id={`menu-role-${r.id}`}
                  checked={selectedRoleIds.has(r.id)}
                  onCheckedChange={(v) => {
                    setSelectedRoleIds((prev) => {
                      const n = new Set(prev)
                      if (v === true) n.add(r.id)
                      else n.delete(r.id)
                      return n
                    })
                  }}
                />
                <span>{r.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleDialogMenu(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => updateMenuRoles.mutate()}
              disabled={updateMenuRoles.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
