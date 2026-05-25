import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Activity, AlertTriangle, Bell, Server, WifiOff } from "lucide-react"
import { Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AlertsService, TargetsService } from "@/client"
import { getAlertColumns } from "@/components/Alerts/columns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/Common/DataTable"
import useAuth from "@/hooks/useAuth"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: i18n.t("meta.dashboard") }],
  }),
})

function SummaryCards() {
  const { t } = useTranslation()
  const { data: targetSummary } = useSuspenseQuery({
    queryKey: ["targets-summary"],
    queryFn: () => TargetsService.readTargetsSummary(),
  })
  const { data: alertSummary } = useSuspenseQuery({
    queryKey: ["alerts-summary"],
    queryFn: () => AlertsService.readAlertsSummary(),
  })

  const cards = [
    {
      key: "total",
      label: t("dashboard.cards.total"),
      value: targetSummary.total,
      icon: Server,
    },
    {
      key: "online",
      label: t("dashboard.cards.online"),
      value: targetSummary.online,
      icon: Activity,
      className: "text-green-600",
    },
    {
      key: "firing",
      label: t("dashboard.cards.firing"),
      value: alertSummary.firing,
      icon: Bell,
      className: "text-destructive",
    },
    {
      key: "offline",
      label: t("dashboard.cards.offline"),
      value: targetSummary.offline,
      icon: WifiOff,
      className: "text-muted-foreground",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            <card.icon className={`size-4 ${card.className ?? ""}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecentAlerts() {
  const { t } = useTranslation()
  const columns = useMemo(() => getAlertColumns(t, { showAck: true }), [t])
  const { data } = useSuspenseQuery({
    queryKey: ["alerts", "dashboard"],
    queryFn: () => AlertsService.readAlerts({ limit: 5 }),
  })
  const active = data.data.filter(
    (a) => a.status === "firing" || a.status === "acknowledged",
  )

  if (active.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("dashboard.noActiveAlerts")}</p>
    )
  }

  return <DataTable columns={columns} data={active} />
}

function DashboardContent() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const displayName = currentUser?.full_name || currentUser?.email || ""

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.greeting", { name: displayName })}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.welcome")}</p>
        </div>
        <Badge variant="outline">{t("dashboard.mvpBadge")}</Badge>
      </div>

      <SummaryCards />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              {t("dashboard.recentAlerts")}
            </CardTitle>
            <CardDescription>{t("dashboard.recentAlertsHint")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/alerts/active">{t("dashboard.viewAllAlerts")}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <RecentAlerts />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.quickActions")}</CardTitle>
          <CardDescription>{t("dashboard.quickActionsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/targets">{t("dashboard.manageTargets")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/alerts/rules">{t("dashboard.manageAlertRules")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/notifications/channels">{t("dashboard.manageNotifications")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Dashboard() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
