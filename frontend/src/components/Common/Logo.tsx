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
        <img
          src={logos.full}
          alt="CFMOTO"
          className={cn(
            "h-7 w-auto max-w-[140px] object-contain group-data-[collapsible=icon]:hidden",
            className,
          )}
        />
        <img
          src={logos.icon}
          alt="CFMOTO"
          className={cn(
            "hidden size-7 object-contain group-data-[collapsible=icon]:block",
            className,
          )}
        />
      </>
    ) : (
      <img
        src={variant === "full" ? logos.full : logos.icon}
        alt="CFMOTO"
        className={cn(
          variant === "full"
            ? "h-7 w-auto max-w-[140px] object-contain"
            : "size-7 object-contain",
          className,
        )}
      />
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
