import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { LayoutDashboard } from "lucide-react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { DashboardsService } from "@/client"
import PendingItems from "@/components/Pending/PendingItems"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import i18n from "@/i18n"
import { resolveMenuTitle } from "@/utils/menuTitle"

export const Route = createFileRoute("/_layout/dashboards")({
  component: DashboardsPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.dashboards") }],
  }),
})

function DashboardsGrid() {
  const { i18n: i18nInstance, t } = useTranslation()
  const { data } = useSuspenseQuery({
    queryKey: ["dashboards"],
    queryFn: () => DashboardsService.readDashboards(),
  })

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.data.map((dashboard) => (
        <Link key={dashboard.id} to="/dashboards/$slug" params={{ slug: dashboard.slug }}>
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="size-4" />
                {resolveMenuTitle(
                  { title_zh: dashboard.title_zh, title_en: dashboard.title_en },
                  i18nInstance.language,
                )}
              </CardTitle>
              <CardDescription>
                {i18nInstance.language.startsWith("zh")
                  ? dashboard.description_zh
                  : dashboard.description_en}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
      {data.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("dashboardsPage.empty")}</p>
      ) : null}
    </div>
  )
}

function DashboardsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboardsPage.title")}</h1>
        <p className="text-muted-foreground">{t("dashboardsPage.subtitle")}</p>
      </div>
      <Suspense fallback={<PendingItems />}>
        <DashboardsGrid />
      </Suspense>
    </div>
  )
}
