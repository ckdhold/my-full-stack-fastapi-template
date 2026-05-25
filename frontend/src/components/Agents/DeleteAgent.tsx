import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { AgentsService } from "@/client"
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const DeleteAgent = ({ id, onSuccess }: { id: string; onSuccess: () => void }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { handleSubmit } = useForm()

  const mutation = useMutation({
    mutationFn: () => AgentsService.deleteAgent({ id }),
    onSuccess: () => {
      showSuccessToast(t("agents.toastDeleted"))
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem
        variant="destructive"
        onSelect={(e) => e.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <Trash2 />
        {t("agents.deleteMenu")}
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(() => mutation.mutate())}>
          <DialogHeader>
            <DialogTitle>{t("agents.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("agents.deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={mutation.isPending}>
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              type="submit"
              loading={mutation.isPending}
            >
              {t("common.delete")}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteAgent
