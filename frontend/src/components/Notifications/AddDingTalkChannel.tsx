import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { NotificationsService } from "@/client"
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
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const AddDingTalkChannel = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1),
        webhook_url: z.string().url(),
        secret: z.string().optional(),
      }),
    [],
  )

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", webhook_url: "", secret: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      NotificationsService.createChannel({
        requestBody: {
          name: data.name,
          type: "dingtalk",
          enabled: true,
          config_json: {
            webhook_url: data.webhook_url,
            ...(data.secret ? { secret: data.secret } : {}),
          },
        },
      }),
    onSuccess: () => {
      showSuccessToast(t("notificationChannels.toastCreated"))
      form.reset()
      setOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-channels"] })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          {t("notificationChannels.addDingTalk")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
            <DialogHeader>
              <DialogTitle>{t("notificationChannels.addDingTalkTitle")}</DialogTitle>
              <DialogDescription>
                {t("notificationChannels.addDingTalkDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notificationChannels.nameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("notificationChannels.namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="webhook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notificationChannels.webhookLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notificationChannels.secretLabel")}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t("notificationChannels.secretPlaceholder")} {...field} />
                    </FormControl>
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

export default AddDingTalkChannel
