import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { NotificationPolicyPublic } from "@/client"
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
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export default function DeleteNotificationPolicy({
  policy,
}: {
  policy: NotificationPolicyPublic
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () => NotificationsService.deletePolicy({ id: policy.id }),
    onSuccess: () => {
      showSuccessToast(t("notificationPolicies.toastDeleted"))
      setOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-policies"] })
    },
  })

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("notificationPolicies.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("notificationPolicies.deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {t("common.delete")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
