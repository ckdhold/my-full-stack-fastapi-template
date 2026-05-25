import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { AgentPublic } from "@/client"
import { AgentsService } from "@/client"
import AddAgent from "@/components/Agents/AddAgent"
import { getAgentColumns } from "@/components/Agents/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/admin/agents")({
  component: AgentsAdminPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.agents") }],
  }),
})

function AgentsTableContent({ columns }: { columns: ColumnDef<AgentPublic>[] }) {
  const { data } = useSuspenseQuery({
    queryKey: ["agents"],
    queryFn: () => AgentsService.readAgents({ skip: 0, limit: 100 }),
  })
  return <DataTable columns={columns} data={data.data} />
}

function AgentsAdminPage() {
  const { t } = useTranslation()
  const columns = useMemo(() => getAgentColumns(t), [t])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("agentsPage.title")}
          </h1>
          <p className="text-muted-foreground">{t("agentsPage.subtitle")}</p>
        </div>
        <AddAgent />
      </div>
      <Suspense fallback={<PendingItems />}>
        <AgentsTableContent columns={columns} />
      </Suspense>
    </div>
  )
}
