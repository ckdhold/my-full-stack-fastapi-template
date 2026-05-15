import { useTranslation } from "react-i18next"
import { FaGithub, FaLinkedinIn } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"

const socialLinks = [
  {
    icon: FaGithub,
    href: "https://github.com/fastapi/fastapi",
    labelKey: "social.github" as const,
  },
  {
    icon: FaXTwitter,
    href: "https://x.com/fastapi",
    labelKey: "social.x" as const,
  },
  {
    icon: FaLinkedinIn,
    href: "https://linkedin.com/company/fastapi",
    labelKey: "social.linkedin" as const,
  },
]

export function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          {t("footer.tagline", { year: currentYear })}
        </p>
        <div className="flex items-center gap-4">
          {socialLinks.map(({ icon: Icon, href, labelKey }) => (
            <a
              key={labelKey}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(labelKey)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
