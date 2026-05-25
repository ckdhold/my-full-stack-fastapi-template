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
import { resolveMenuTitle } from "@/utils/menuTitle"

const emptyForm = {
  path: "",
  title_zh: "",
  title_en: "",
  icon: "",
  sort_order: "100",
}

export function MenuManagement() {
  const { t, i18n } = useTranslation()
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
  const [editMenu, setEditMenu] = useState<MenuPublic | null>(null)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)

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

  useEffect(() => {
    if (!editMenu) {
      setEditForm(emptyForm)
      return
    }
    setEditForm({
      path: editMenu.path,
      title_zh: editMenu.title_zh,
      title_en: editMenu.title_en,
      icon: editMenu.icon ?? "",
      sort_order: String(editMenu.sort_order),
    })
  }, [editMenu])

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

  const createMenu = useMutation({
    mutationFn: async () => {
      await MenusService.createMenu({
        requestBody: {
          path: createForm.path.trim(),
          title_zh: createForm.title_zh.trim(),
          title_en: createForm.title_en.trim(),
          icon: createForm.icon.trim() || null,
          sort_order: Number(createForm.sort_order) || 100,
          is_active: true,
        },
      })
    },
    onSuccess: async () => {
      showSuccessToast(t("menusPage.toastCreated"))
      setCreateForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ["menus"] })
    },
    onError: () => showErrorToast(t("errors.generic")),
  })

  const saveMenu = useMutation({
    mutationFn: async () => {
      if (!editMenu) return
      await MenusService.updateMenu({
        menuId: editMenu.id,
        requestBody: {
          path: editForm.path.trim(),
          title_zh: editForm.title_zh.trim(),
          title_en: editForm.title_en.trim(),
          icon: editForm.icon.trim() || null,
          sort_order: Number(editForm.sort_order) || editMenu.sort_order,
        },
      })
    },
    onSuccess: async () => {
      showSuccessToast(t("menusPage.toastUpdated"))
      setEditMenu(null)
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
  const canSubmitCreate =
    createForm.path.trim() &&
    createForm.title_zh.trim() &&
    createForm.title_en.trim()

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("menusPage.createTitle")}</CardTitle>
          <CardDescription>{t("menusPage.createHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="menu-path">{t("menusPage.path")}</Label>
            <Input
              id="menu-path"
              value={createForm.path}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, path: e.target.value }))
              }
              placeholder="/example"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-title-zh">{t("menusPage.titleZh")}</Label>
            <Input
              id="menu-title-zh"
              value={createForm.title_zh}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, title_zh: e.target.value }))
              }
              placeholder={t("menusPage.titleZhPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-title-en">{t("menusPage.titleEn")}</Label>
            <Input
              id="menu-title-en"
              value={createForm.title_en}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, title_en: e.target.value }))
              }
              placeholder={t("menusPage.titleEnPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-icon">{t("menusPage.icon")}</Label>
            <Input
              id="menu-icon"
              value={createForm.icon}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, icon: e.target.value }))
              }
              placeholder="LayoutDashboard"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-sort">{t("menusPage.sort")}</Label>
            <Input
              id="menu-sort"
              type="number"
              value={createForm.sort_order}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, sort_order: e.target.value }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => createMenu.mutate()}
              disabled={createMenu.isPending || !canSubmitCreate}
            >
              {t("common.save")}
            </Button>
          </div>
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
                <TableHead>{t("menusPage.titleZh")}</TableHead>
                <TableHead>{t("menusPage.titleEn")}</TableHead>
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
                  <TableCell>{m.title_zh}</TableCell>
                  <TableCell>{m.title_en}</TableCell>
                  <TableCell>{m.icon ?? "—"}</TableCell>
                  <TableCell>{m.sort_order}</TableCell>
                  <TableCell className="space-x-2 text-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMenu(m)}
                    >
                      {t("common.edit")}
                    </Button>
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

      <Dialog open={!!editMenu} onOpenChange={(o) => !o && setEditMenu(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("menusPage.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-menu-path">{t("menusPage.path")}</Label>
              <Input
                id="edit-menu-path"
                value={editForm.path}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, path: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-menu-title-zh">{t("menusPage.titleZh")}</Label>
              <Input
                id="edit-menu-title-zh"
                value={editForm.title_zh}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, title_zh: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-menu-title-en">{t("menusPage.titleEn")}</Label>
              <Input
                id="edit-menu-title-en"
                value={editForm.title_en}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, title_en: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-menu-icon">{t("menusPage.icon")}</Label>
              <Input
                id="edit-menu-icon"
                value={editForm.icon}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, icon: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-menu-sort">{t("menusPage.sort")}</Label>
              <Input
                id="edit-menu-sort"
                type="number"
                value={editForm.sort_order}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, sort_order: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditMenu(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => saveMenu.mutate()}
              disabled={
                saveMenu.isPending ||
                !editForm.path.trim() ||
                !editForm.title_zh.trim() ||
                !editForm.title_en.trim()
              }
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!roleDialogMenu}
        onOpenChange={(o) => !o && setRoleDialogMenu(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {roleDialogMenu
                ? t("menusPage.rolesDialogTitleWithName", {
                    name: resolveMenuTitle(roleDialogMenu, i18n.language),
                  })
                : t("menusPage.rolesDialogTitle")}
            </DialogTitle>
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
