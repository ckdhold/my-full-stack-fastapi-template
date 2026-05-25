import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { TargetPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DeleteTarget from "./DeleteTarget"
import EditTarget from "./EditTarget"

interface TargetActionsMenuProps {
  target: TargetPublic
}

export const TargetActionsMenu = ({ target }: TargetActionsMenuProps) => {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditTarget target={target} onSuccess={() => setOpen(false)} />
        <DeleteTarget id={target.id} onSuccess={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
