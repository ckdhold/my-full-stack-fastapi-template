import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { type TargetCreate, TargetsService } from "@/client"
import { TARGET_TYPES } from "@/components/Targets/columns"
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
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim()
  if (!trimmed) return {}
  return JSON.parse(trimmed) as Record<string, unknown>
}

const AddTarget = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, { message: t("validation.nameRequired") }),
        type: z.enum(TARGET_TYPES),
        description: z.string().optional(),
        envLabel: z.string().optional(),
        configJson: z
          .string()
          .optional()
          .refine(
            (value) => {
              if (!value?.trim()) return true
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
      name: "",
      type: "host",
      description: "",
      envLabel: "",
      configJson: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: TargetCreate) =>
      TargetsService.createTarget({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(t("targets.toastCreated"))
      form.reset()
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] })
      queryClient.invalidateQueries({ queryKey: ["targets-summary"] })
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const labels: Record<string, string> = {}
    if (data.envLabel?.trim()) {
      labels.env = data.envLabel.trim()
    }
    mutation.mutate({
      name: data.name,
      type: data.type,
      description: data.description || undefined,
      labels,
      config_json: parseJsonObject(data.configJson || ""),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          {t("targets.addTarget")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("targets.addTitle")}</DialogTitle>
          <DialogDescription>{t("targets.addDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("targets.nameLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t("targets.namePlaceholder")} {...field} />
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
                name="envLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("targets.envLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder="production" {...field} />
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
                      <Input placeholder={t("common.description")} {...field} />
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
                      <Textarea
                        placeholder='{"url": "https://example.com/health"}'
                        rows={4}
                        {...field}
                      />
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

export default AddTarget
