import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Copy, Plus, Trash2 } from "lucide-react"
import { Suspense, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import type { ApiTokenPublic } from "@/client"
import { TargetsService, TokensService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingButton } from "@/components/ui/loading-button"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/admin/tokens")({
  component: TokensAdminPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.tokens") }],
  }),
})

function AddTokenDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [, copy] = useCopyToClipboard()
  const { data: targets } = useSuspenseQuery({
    queryKey: ["targets"],
    queryFn: () => TargetsService.readTargets({ limit: 100 }),
  })

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("validation.nameRequired")),
        target_id: z.string().min(1),
      }),
    [t],
  )

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", target_id: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      TokensService.createToken({ requestBody: values }),
    onSuccess: (result) => {
      setCreatedToken(result.token)
      showSuccessToast(t("tokensPage.created"))
      queryClient.invalidateQueries({ queryKey: ["tokens"] })
    },
    onError: handleError,
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setCreatedToken(null)
          form.reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("tokensPage.add")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tokensPage.add")}</DialogTitle>
          <DialogDescription>{t("tokensPage.addHint")}</DialogDescription>
        </DialogHeader>
        {createdToken ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("tokensPage.copyOnce")}</p>
            <div className="flex gap-2">
              <Input readOnly value={createdToken} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={() => copy(createdToken)}>
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              POST /api/v1/ingest/push/metrics · Header: X-Api-Token
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("tokensPage.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("tokensPage.target")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("tokensPage.selectTarget")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {targets.data.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <LoadingButton type="submit" loading={mutation.isPending}>
                  {t("common.save")}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TokensTable() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { data } = useSuspenseQuery({
    queryKey: ["tokens"],
    queryFn: () => TokensService.readTokens({ limit: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => TokensService.deleteToken({ id }),
    onSuccess: () => {
      showSuccessToast(t("tokensPage.deleted"))
      queryClient.invalidateQueries({ queryKey: ["tokens"] })
    },
    onError: handleError,
  })

  const columns = useMemo<ColumnDef<ApiTokenPublic>[]>(
    () => [
      { accessorKey: "name", header: t("tokensPage.name") },
      {
        accessorKey: "target_name",
        header: t("tokensPage.target"),
        cell: ({ row }) => row.original.target_name || row.original.target_id,
      },
      {
        accessorKey: "token_prefix",
        header: t("tokensPage.prefix"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.token_prefix}…</span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate(row.original.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ],
    [deleteMutation, t],
  )

  return <DataTable columns={columns} data={data.data} />
}

function TokensAdminPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("tokensPage.title")}</h1>
          <p className="text-muted-foreground">{t("tokensPage.subtitle")}</p>
        </div>
        <Suspense fallback={null}>
          <AddTokenDialog />
        </Suspense>
      </div>
      <Suspense fallback={<PendingItems />}>
        <TokensTable />
      </Suspense>
    </div>
  )
}
