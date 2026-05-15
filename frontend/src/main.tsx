import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import "@/i18n"
import { OpenAPI } from "./client"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import "./index.css"
import { queryClient } from "./queryClient"
import { routeTree } from "./routeTree.gen"

const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ""
OpenAPI.BASE = import.meta.env.DEV ? "" : apiBase.replace(/\/$/, "")
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV ? (
          <TanStackRouterDevtools position="bottom-right" router={router} />
        ) : null}
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
