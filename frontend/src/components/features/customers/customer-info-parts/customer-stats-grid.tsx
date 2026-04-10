import { Award, Calendar } from "lucide-react"

import type { Customer } from "@/types/customer"

type CustomerStatsGridProps = {
  customer: Customer
}

export function CustomerStatsGrid({ customer }: CustomerStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 text-center">
      <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-700/5 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-amber-500/10 border border-amber-500/20">
        <div className="absolute -right-4 -top-4 rounded-full bg-amber-500/10 p-8 transition-transform duration-500 group-hover:scale-125"></div>
        <Award className="relative z-10 h-6 w-6 text-amber-500 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        <p className="relative z-10 text-3xl font-bold text-amber-600 dark:text-amber-400">{customer.points || 0}</p>
        <p className="relative z-10 text-xs text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider font-semibold mt-1">Points</p>
      </div>
      <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-500/10 to-zinc-700/5 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md border border-zinc-500/20">
        <div className="absolute -right-4 -top-4 rounded-full bg-zinc-500/10 p-8 transition-transform duration-500 group-hover:scale-125"></div>
        <Calendar className="relative z-10 h-6 w-6 text-zinc-500 dark:text-zinc-400 mx-auto mb-2" />
        <p className="relative z-10 text-3xl font-bold text-zinc-700 dark:text-zinc-300">{customer.visits || 0}</p>
        <p className="relative z-10 text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Visits</p>
      </div>
    </div>
  )
}
