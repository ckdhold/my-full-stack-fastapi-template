import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { AlertsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export function AckAlertButton({ alertId }: { alertId: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () =>
      AlertsService.ackAlert({ id: alertId, requestBody: { note: note || undefined } }),
    onSuccess: () => {
      showSuccessToast(t("alerts.toastAcked"))
      setOpen(false)
      setNote("")
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] })
      queryClient.invalidateQueries({ queryKey: ["alerts-summary"] })
    },
  })

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t("alerts.ack")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("alerts.ackTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("alerts.ackNotePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <LoadingButton loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {t("alerts.ackConfirm")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
