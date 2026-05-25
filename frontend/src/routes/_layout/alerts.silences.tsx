import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, Trash2 } from "lucide-react"
import { Suspense, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { SilencesService, TargetsService } from "@/client"
import PendingItems from "@/components/Pending/PendingItems"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import i18n from "@/i18n"

export const Route = createFileRoute("/_layout/alerts/silences")({
  component: SilencesPage,
  head: () => ({
    meta: [{ title: i18n.t("meta.alertSilences") }],
  }),
})

function AddSilenceDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { data: targets } = useSuspenseQuery({
    queryKey: ["targets"],
    queryFn: () => TargetsService.readTargets({ limit: 100 }),
  })

  const schema = useMemo(
    () =>
      z.object({
        target_id: z.string().optional(),
        reason: z.string().min(1, t("validation.nameRequired")),
        hours: z.number().min(1).max(168),
      }),
    [t],
  )

  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { target_id: "all", reason: "", hours: 2 },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const startsAt = new Date()
      const endsAt = new Date(startsAt.getTime() + values.hours * 3600 * 1000)
      return SilencesService.createSilence({
        requestBody: {
          target_id: values.target_id === "all" ? null : values.target_id,
          reason: values.reason,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        },
      })
    },
    onSuccess: () => {
      showSuccessToast(t("silencesPage.created"))
      queryClient.invalidateQueries({ queryKey: ["silences"] })
      setOpen(false)
      form.reset()
    },
    onError: handleError,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("silencesPage.add")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("silencesPage.add")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <FormField
              control={form.control}
              name="target_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("silencesPage.target")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">{t("silencesPage.allTargets")}</SelectItem>
                      {targets.data.map((target) => (
                        <SelectItem key={target.id} value={target.id}>
                          {target.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("silencesPage.reason")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("silencesPage.durationHours")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
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
      </DialogContent>
    </Dialog>
  )
}

function SilencesList() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { data } = useSuspenseQuery({
    queryKey: ["silences"],
    queryFn: () => SilencesService.readSilences({ limit: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => SilencesService.deleteSilence({ id }),
    onSuccess: () => {
      showSuccessToast(t("silencesPage.deleted"))
      queryClient.invalidateQueries({ queryKey: ["silences"] })
    },
    onError: handleError,
  })

  if (data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("silencesPage.empty")}</p>
  }

  return (
    <div className="space-y-3">
      {data.data.map((silence) => (
        <div
          key={silence.id}
          className="flex items-start justify-between gap-4 rounded-lg border p-4"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {silence.target_name || t("silencesPage.allTargets")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(silence.starts_at).toLocaleString()} -{" "}
                {new Date(silence.ends_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-sm">{silence.reason}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate(silence.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function SilencesPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("silencesPage.title")}</h1>
          <p className="text-muted-foreground">{t("silencesPage.subtitle")}</p>
        </div>
        <Suspense fallback={null}>
          <AddSilenceDialog />
        </Suspense>
      </div>
      <Suspense fallback={<PendingItems />}>
        <SilencesList />
      </Suspense>
    </div>
  )
}
