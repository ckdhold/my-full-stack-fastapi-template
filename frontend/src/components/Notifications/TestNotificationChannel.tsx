import { useMutation } from "@tanstack/react-query"
import { Send } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { NotificationChannelPublic } from "@/client"
import { NotificationsService } from "@/client"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export default function TestNotificationChannel({
  channel,
}: {
  channel: NotificationChannelPublic
}) {
  const { t } = useTranslation()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: () => NotificationsService.testChannel({ id: channel.id }),
    onSuccess: () => showSuccessToast(t("notificationChannels.toastTested")),
    onError: handleError.bind(showErrorToast),
  })

  return (
    <LoadingButton
      size="sm"
      variant="outline"
      loading={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <Send className="mr-1 size-3" />
      {t("notificationChannels.test")}
    </LoadingButton>
  )
}
