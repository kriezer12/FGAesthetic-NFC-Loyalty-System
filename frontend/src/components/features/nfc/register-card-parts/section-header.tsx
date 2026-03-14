import type { ReactNode } from "react"

import { Separator } from "@/components/ui/separator"

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {children}
      </span>
      <Separator className="flex-1" />
    </div>
  )
}
