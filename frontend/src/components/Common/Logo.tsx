import { Link } from "@tanstack/react-router"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const LOGO_DARK = {
  full: "http://cfmoto-evow.oss-cn-hangzhou.aliyuncs.com/AdminFiles/logo2.png",
  icon: "http://cfmoto-evow.oss-cn-hangzhou.aliyuncs.com/AdminFiles/logo2W.png",
}

const LOGO_LIGHT = {
  full: "http://cfmoto-evow.oss-cn-hangzhou.aliyuncs.com/AdminFiles/cfomtoBB.png",
  icon: "http://cfmoto-evow.oss-cn-hangzhou.aliyuncs.com/AdminFiles/cfmotoLogo.png",
}

const FULL_LOGO_BOX = "h-7 w-[120px] shrink-0"
const ICON_LOGO_BOX = "size-7 shrink-0"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const { resolvedTheme } = useTheme()
  const logos = resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT

  const content =
    variant === "responsive" ? (
      <>
        <div
          className={cn(
            "flex items-center group-data-[collapsible=icon]:hidden",
            FULL_LOGO_BOX,
            className,
          )}
        >
          <img
            src={logos.full}
            alt="CFMOTO"
            className="size-full object-contain object-left"
          />
        </div>
        <div
          className={cn(
            "hidden items-center justify-center group-data-[collapsible=icon]:flex",
            ICON_LOGO_BOX,
          )}
        >
          <img
            src={logos.icon}
            alt="CFMOTO"
            className="size-full object-contain"
          />
        </div>
      </>
    ) : variant === "full" ? (
      <div className={cn("flex items-center", FULL_LOGO_BOX, className)}>
        <img
          src={logos.full}
          alt="CFMOTO"
          className="size-full object-contain object-left"
        />
      </div>
    ) : (
      <div className={cn("flex items-center justify-center", ICON_LOGO_BOX, className)}>
        <img
          src={logos.icon}
          alt="CFMOTO"
          className="size-full object-contain"
        />
      </div>
    )

  if (!asLink) {
    return content
  }

  return (
    <Link to="/" className="inline-flex items-center">
      {content}
    </Link>
  )
}
