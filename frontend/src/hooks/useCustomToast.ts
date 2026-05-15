import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const useCustomToast = () => {
  const { t } = useTranslation()

  const showSuccessToast = (description: string) => {
    toast.success(t("toast.successTitle"), {
      description,
    })
  }

  const showErrorToast = (description: string) => {
    toast.error(t("toast.errorTitle"), {
      description,
    })
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
