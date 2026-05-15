import type { LucideIcon } from "lucide-react"
import * as Icons from "lucide-react"

export function resolveMenuIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Icons.Circle
  const Icon = (Icons as unknown as Record<string, LucideIcon | undefined>)[
    name
  ]
  return Icon ?? Icons.Circle
}
