import { ChevronDown, Languages } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const locales = [
  { code: "en" as const, labelKey: "language.en" },
  { code: "zh" as const, labelKey: "language.zh" },
]

/** Collapsed dropdown: current language + menu (main header & auth pages) */
export function CompactLanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const resolved = (i18n.resolvedLanguage ?? i18n.language).toLowerCase()
  const currentLabel = resolved.startsWith("zh")
    ? t("language.zh")
    : t("language.en")

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5 px-2 font-normal", className)}
          data-testid="language-button"
        >
          <Languages className="size-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[5.5rem] min-w-0 truncate sm:max-w-none">
            {currentLabel}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground opacity-70" />
          <span className="sr-only">{t("language.label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map(({ code, labelKey }) => (
          <DropdownMenuItem
            key={code}
            data-testid={`lang-${code}`}
            onClick={() => void i18n.changeLanguage(code)}
          >
            {t(labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
