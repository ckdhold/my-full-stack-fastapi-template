import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AlertsService, type AlertRuleCreate, TargetsService } from "@/client"
import {
  ALERT_OPERATORS,
  ALERT_SEVERITIES,
} from "@/components/Alerts/columns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
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
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const AddAlertRule = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: targets } = useSuspenseQuery({
    queryKey: ["targets"],
    queryFn: () => TargetsService.readTargets({ limit: 100 }),
  })

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1),
        target_id: z.string().min(1),
        metric: z.string().min(1),
        operator: z.enum(ALERT_OPERATORS),
        threshold: z.number(),
        severity: z.enum(ALERT_SEVERITIES),
        no_data_sec: z.number().optional(),
      }),
    [],
  )

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      target_id: "",
      metric: "probe.http.up",
      operator: "lt",
      threshold: 1,
      severity: "p2",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      AlertsService.createAlertRule({ requestBody: data as AlertRuleCreate }),
    onSuccess: () => {
      showSuccessToast(t("alertRules.toastCreated"))
      form.reset()
      setOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          {t("alertRules.addRule")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
            <DialogHeader>
              <DialogTitle>{t("alertRules.addTitle")}</DialogTitle>
              <DialogDescription>{t("alertRules.addDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("alertRules.nameLabel")}</FormLabel>
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
                    <FormLabel>{t("alertRules.targetLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("alertRules.selectTarget")} />
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
              <FormField
                control={form.control}
                name="metric"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("alertRules.metricLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder="probe.http.up" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="operator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("alertRules.operatorLabel")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ALERT_OPERATORS.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("alertRules.thresholdLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("alertRules.severityLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALERT_SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
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

export default AddAlertRule
