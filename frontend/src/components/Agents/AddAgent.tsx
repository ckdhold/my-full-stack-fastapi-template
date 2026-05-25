import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Copy, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

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
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const AddAgent = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [, copy] = useCopyToClipboard()

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, { message: t("validation.nameRequired") }),
        host_id: z.string().min(1, { message: t("validation.hostIdRequired") }),
      }),
    [t],
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", host_id: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      AgentsService.createAgent({ requestBody: data }),
    onSuccess: (result) => {
      showSuccessToast(t("agents.toastCreated"))
      setCreatedToken(result.token)
      form.reset()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setCreatedToken(null)
      form.reset()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          {t("agents.addAgent")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("agents.tokenTitle")}</DialogTitle>
              <DialogDescription>{t("agents.tokenDescription")}</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-muted p-3 font-mono text-sm break-all">
              {createdToken}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => copy(createdToken)}
              >
                <Copy className="mr-2 size-4" />
                {t("agents.copyToken")}
              </Button>
              <DialogClose asChild>
                <Button>{t("common.continue")}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
              <DialogHeader>
                <DialogTitle>{t("agents.addTitle")}</DialogTitle>
                <DialogDescription>{t("agents.addDescription")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agents.nameLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="host_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("agents.hostIdLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder="web-01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={mutation.isPending}>
                    {t("common.cancel")}
                  </Button>
                </DialogClose>
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

export default AddAgent
