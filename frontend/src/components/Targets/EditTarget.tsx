import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { type TargetPublic, TargetsService } from "@/client"
import {
  TARGET_STATUSES,
  TARGET_TYPES,
} from "@/components/Targets/columns"
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
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim()
  if (!trimmed) return {}
  return JSON.parse(trimmed) as Record<string, unknown>
}

interface EditTargetProps {
  target: TargetPublic
  onSuccess: () => void
}

const EditTarget = ({ target, onSuccess }: EditTargetProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, { message: t("validation.nameRequired") }),
        type: z.enum(TARGET_TYPES),
        status: z.enum(TARGET_STATUSES),
        description: z.string().optional(),
        envLabel: z.string().optional(),
        configJson: z
          .string()
          .refine(
            (value) => {
              if (!value.trim()) return true
              try {
                parseJsonObject(value)
                return true
              } catch {
                return false
              }
            },
            { message: t("validation.invalidJson") },
          ),
      }),
    [t],
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: target.name,
      type: target.type as (typeof TARGET_TYPES)[number],
      status: target.status as (typeof TARGET_STATUSES)[number],
      description: target.description ?? "",
      envLabel: target.labels?.env ?? "",
      configJson: JSON.stringify(target.config_json ?? {}, null, 2),
    },
  })

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      const labels = { ...target.labels }
      if (data.envLabel?.trim()) {
        labels.env = data.envLabel.trim()
      } else {
        delete labels.env
      }
      return TargetsService.updateTarget({
        id: target.id,
        requestBody: {
          name: data.name,
          type: data.type,
          status: data.status,
          description: data.description || undefined,
          labels,
          config_json: parseJsonObject(data.configJson),
        },
      })
    },
    onSuccess: () => {
      showSuccessToast(t("targets.toastUpdated"))
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] })
      queryClient.invalidateQueries({ queryKey: ["targets-summary"] })
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem
        onSelect={(e) => e.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <Pencil />
        {t("targets.editMenu")}
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
            <DialogHeader>
              <DialogTitle>{t("targets.editTitle")}</DialogTitle>
              <DialogDescription>{t("targets.editDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("targets.nameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("targets.typeLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TARGET_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`targets.type.${type}`)}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("targets.statusLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TARGET_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`targets.status.${status}`)}
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
                name="envLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("targets.envLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.description")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="configJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("targets.configLabel")}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
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
      </DialogContent>
    </Dialog>
  )
}

export default EditTarget
