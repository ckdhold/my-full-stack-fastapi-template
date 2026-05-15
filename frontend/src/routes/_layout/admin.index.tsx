import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { getUserColumns, type UserTableData } from "@/components/Admin/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingUsers from "@/components/Pending/PendingUsers"
import useAuth from "@/hooks/useAuth"
import i18n from "@/i18n"

function getUsersQueryOptions() {
  return {
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 100 }),
    queryKey: ["users"],
  }
}

export const Route = createFileRoute("/_layout/admin/")({
  component: AdminUsersPage,
  head: () => ({
    meta: [
      {
        title: i18n.t("meta.admin"),
      },
    ],
  }),
})

function UsersTableContent({
  columns,
}: {
  columns: ColumnDef<UserTableData>[]
}) {
  const { user: currentUser } = useAuth()
  const { data: users } = useSuspenseQuery(getUsersQueryOptions())

  const tableData: UserTableData[] = users.data.map((user: UserPublic) => ({
    ...user,
    isCurrentUser: currentUser?.id === user.id,
  }))

  return <DataTable columns={columns} data={tableData} />
}

function UsersTable({ columns }: { columns: ColumnDef<UserTableData>[] }) {
  return (
    <Suspense fallback={<PendingUsers />}>
      <UsersTableContent columns={columns} />
    </Suspense>
  )
}

function AdminUsersPage() {
  const { t } = useTranslation()
  const columns = useMemo(() => getUserColumns(t), [t])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("adminPage.title")}
          </h1>
          <p className="text-muted-foreground">{t("adminPage.subtitle")}</p>
        </div>
        <AddUser />
      </div>
      <UsersTable columns={columns} />
    </div>
  )
}
