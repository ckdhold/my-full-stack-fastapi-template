import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"
import { Link } from "@tanstack/react-router"
import { Check, Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { TargetPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { cn } from "@/lib/utils"
import { TargetActionsMenu } from "./TargetActionsMenu"

function CopyId({ id }: { id: string }) {
  const { t } = useTranslation()
  const [copiedText, copy] = useCopyToClipboard()
  const isCopied = copiedText === id

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="font-mono text-xs text-muted-foreground">{id}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copy(id)}
      >
        {isCopied ? (
          <Check className="size-3 text-green-500" />
        ) : (
          <Copy className="size-3" />
        )}
        <span className="sr-only">{t("targetsTable.copyId")}</span>
      </Button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const variant =
    status === "online"
      ? "default"
      : status === "alert"
        ? "destructive"
        : status === "offline"
          ? "secondary"
          : "outline"

  return (
    <Badge variant={variant}>{t(`targets.status.${status}`, status)}</Badge>
  )
}

export function getTargetColumns(t: TFunction): ColumnDef<TargetPublic>[] {
  return [
    {
      accessorKey: "name",
      header: t("targetsTable.name"),
      cell: ({ row }) => (
        <Link
          to="/targets/$targetId"
          params={{ targetId: row.original.id }}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: t("targetsTable.type"),
      cell: ({ row }) => (
        <Badge variant="outline">
          {t(`targets.type.${row.original.type}`, row.original.type)}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: t("targetsTable.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "description",
      header: t("targetsTable.description"),
      cell: ({ row }) => {
        const description = row.original.description
        return (
          <span
            className={cn(
              "max-w-xs truncate block text-muted-foreground",
              !description && "italic",
            )}
          >
            {description || t("targets.noDescription")}
          </span>
        )
      },
    },
    {
      accessorKey: "id",
      header: t("targetsTable.id"),
      cell: ({ row }) => <CopyId id={row.original.id} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <TargetActionsMenu target={row.original} />
        </div>
      ),
    },
  ]
}

export const TARGET_TYPES = [
  "host",
  "http",
  "tcp",
  "database",
  "business",
  "custom",
] as const

export const TARGET_STATUSES = [
  "online",
  "offline",
  "unknown",
  "alert",
] as const
