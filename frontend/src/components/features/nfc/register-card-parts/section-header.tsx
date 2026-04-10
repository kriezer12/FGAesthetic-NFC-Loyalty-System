import type { ReactNode } from "react"

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <div
        className="h-4 w-1 rounded-full shrink-0"
        style={{ background: "linear-gradient(180deg, oklch(0.88 0.06 78), oklch(0.68 0.14 78))" }}
      />
      <span
        className="text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
        style={{ color: "oklch(0.72 0.10 78)" }}
      >
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.06 78 / 20%)" }} />
    </div>
  )
}
