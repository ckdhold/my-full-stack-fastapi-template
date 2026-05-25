import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Phone } from "lucide-react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { OncallService } from "@/client"
import PendingItems from "@/components/Pending/PendingItems"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/notifications/oncall")({
  component: OncallPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.oncall") }],
  }),
})

function OncallList() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery({
    queryKey: ["oncall"],
    queryFn: () => OncallService.readContacts(),
  })

  if (data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("oncallPage.empty")}</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.data.map((contact) => (
        <Card key={contact.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="size-4" />
              {contact.name}
            </CardTitle>
            <CardDescription>{contact.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            {contact.phone ? <span>{contact.phone}</span> : null}
            {contact.role ? <Badge variant="outline">{contact.role}</Badge> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function OncallPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("oncallPage.title")}</h1>
        <p className="text-muted-foreground">{t("oncallPage.subtitle")}</p>
      </div>
      <Suspense fallback={<PendingItems />}>
        <OncallList />
      </Suspense>
    </div>
  )
}
