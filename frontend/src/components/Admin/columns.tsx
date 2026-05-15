import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

import type { UserPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { UserActionsMenu } from "./UserActionsMenu"

export type UserTableData = UserPublic & {
  isCurrentUser: boolean
}

export function getUserColumns(t: TFunction): ColumnDef<UserTableData>[] {
  return [
    {
      accessorKey: "full_name",
      header: t("admin.columnFullName"),
      cell: ({ row }) => {
        const fullName = row.original.full_name
        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium",
                !fullName && "text-muted-foreground",
              )}
            >
              {fullName || t("common.na")}
            </span>
            {row.original.isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                {t("admin.badgeYou")}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: t("admin.columnEmail"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "roles",
      header: t("admin.columnRoles"),
      cell: ({ row }) => {
        const names = row.original.roles?.filter(Boolean) ?? []
        return (
          <span className="text-muted-foreground text-sm">
            {names.length ? names.join(", ") : t("common.na")}
          </span>
        )
      },
    },
    {
      accessorKey: "is_superuser",
      header: t("admin.columnRole"),
      cell: ({ row }) => (
        <Badge variant={row.original.is_superuser ? "default" : "secondary"}>
          {row.original.is_superuser
            ? t("admin.roleSuperuser")
            : t("admin.roleUser")}
        </Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: t("admin.columnStatus"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              row.original.is_active ? "bg-green-500" : "bg-gray-400",
            )}
          />
          <span
            className={row.original.is_active ? "" : "text-muted-foreground"}
          >
            {row.original.is_active
              ? t("admin.statusActive")
              : t("admin.statusInactive")}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <UserActionsMenu user={row.original} />
        </div>
      ),
    },
  ]
}
