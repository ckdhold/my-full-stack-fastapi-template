import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"

function DocumentLang() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.language.startsWith("zh")
      ? "zh-CN"
      : "en"
  }, [i18n.language])
  return null
}

export const Route = createRootRoute({
  component: () => (
    <>
      <DocumentLang />
      <HeadContent />
      <Outlet />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  ),
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
