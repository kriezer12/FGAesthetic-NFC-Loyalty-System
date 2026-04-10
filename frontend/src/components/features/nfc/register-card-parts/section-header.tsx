import type { ReactNode } from "react"

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <div
        className="h-4 w-1 rounded-full shrink-0 bg-primary"
      />
      <span 
        className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap text-primary"
      >
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
