import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Search } from "lucide-react"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { ItemPublic } from "@/client"
import { ItemsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddItem from "@/components/Items/AddItem"
import { getItemColumns } from "@/components/Items/columns"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

function getItemsQueryOptions() {
  return {
    queryFn: () => ItemsService.readItems({ skip: 0, limit: 100 }),
    queryKey: ["items"],
  }
}

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  head: () => ({
    meta: [
      {
        title: i18n.t("meta.items"),
      },
    ],
  }),
})

function ItemsTableContent({ columns }: { columns: ColumnDef<ItemPublic>[] }) {
  const { t } = useTranslation()
  const { data: items } = useSuspenseQuery(getItemsQueryOptions())

  if (items.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t("itemsPage.emptyTitle")}</h3>
        <p className="text-muted-foreground">{t("itemsPage.emptySubtitle")}</p>
      </div>
    )
  }

  return <DataTable columns={columns} data={items.data} />
}

function ItemsTable({ columns }: { columns: ColumnDef<ItemPublic>[] }) {
  return (
    <Suspense fallback={<PendingItems />}>
      <ItemsTableContent columns={columns} />
    </Suspense>
  )
}

function Items() {
  const { t } = useTranslation()
  const columns = useMemo(() => getItemColumns(t), [t])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("itemsPage.title")}
          </h1>
          <p className="text-muted-foreground">{t("itemsPage.subtitle")}</p>
        </div>
        <AddItem />
      </div>
      <ItemsTable columns={columns} />
    </div>
  )
}
