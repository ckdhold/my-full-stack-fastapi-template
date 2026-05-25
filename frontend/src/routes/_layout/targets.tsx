import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Search } from "lucide-react"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { TargetPublic } from "@/client"
import { TargetsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddTarget from "@/components/Targets/AddTarget"
import { getTargetColumns } from "@/components/Targets/columns"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

function getTargetsQueryOptions() {
  return {
    queryFn: () => TargetsService.readTargets({ skip: 0, limit: 100 }),
    queryKey: ["targets"],
  }
}

export const Route = createFileRoute("/_layout/targets")({
  component: Targets,
  head: () => ({
    meta: [
      {
        title: i18n.t("meta.targets"),
      },
    ],
  }),
})

function TargetsTableContent({ columns }: { columns: ColumnDef<TargetPublic>[] }) {
  const { t } = useTranslation()
  const { data: targets } = useSuspenseQuery(getTargetsQueryOptions())

  if (targets.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t("targetsPage.emptyTitle")}</h3>
        <p className="text-muted-foreground">{t("targetsPage.emptySubtitle")}</p>
      </div>
    )
  }

  return <DataTable columns={columns} data={targets.data} />
}

function TargetsTable({ columns }: { columns: ColumnDef<TargetPublic>[] }) {
  return (
    <Suspense fallback={<PendingItems />}>
      <TargetsTableContent columns={columns} />
    </Suspense>
  )
}

function Targets() {
  const { t } = useTranslation()
  const columns = useMemo(() => getTargetColumns(t), [t])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("targetsPage.title")}
          </h1>
          <p className="text-muted-foreground">{t("targetsPage.subtitle")}</p>
        </div>
        <AddTarget />
      </div>
      <TargetsTable columns={columns} />
    </div>
  )
}
