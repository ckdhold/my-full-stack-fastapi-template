import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { NOTIFICATION_SEVERITIES, NotificationsService } from "@/client"
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

const AddNotificationPolicy = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: channels } = useSuspenseQuery({
    queryKey: ["notification-channels"],
    queryFn: () => NotificationsService.readChannels({ limit: 100 }),
  })

  const formSchema = useMemo(
    () =>
      z.object({
        severity: z.enum(NOTIFICATION_SEVERITIES),
        channel_id: z.string().min(1),
      }),
    [],
  )

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { severity: "p1", channel_id: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      NotificationsService.createPolicy({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(t("notificationPolicies.toastCreated"))
      form.reset({ severity: "p1", channel_id: "" })
      setOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-policies"] })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          {t("notificationPolicies.addPolicy")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
            <DialogHeader>
              <DialogTitle>{t("notificationPolicies.addTitle")}</DialogTitle>
              <DialogDescription>{t("notificationPolicies.addDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notificationPolicies.severityLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NOTIFICATION_SEVERITIES.map((s: (typeof NOTIFICATION_SEVERITIES)[number]) => (
                          <SelectItem key={s} value={s}>
                            {s.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="channel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notificationPolicies.channelLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("notificationPolicies.selectChannel")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {channels.data.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            {channel.name} ({t(`notificationChannels.types.${channel.type}`, channel.type)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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

export default AddNotificationPolicy
