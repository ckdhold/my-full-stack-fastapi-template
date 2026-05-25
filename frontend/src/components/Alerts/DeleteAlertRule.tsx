import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { AlertsService } from "@/client"
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

export function DeleteAlertRule({ id }: { id: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () => AlertsService.deleteAlertRule({ id }),
    onSuccess: () => {
      showSuccessToast(t("alertRules.toastDeleted"))
      setOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] })
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
            <DialogTitle>{t("alertRules.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("alertRules.deleteDescription")}</DialogDescription>
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
