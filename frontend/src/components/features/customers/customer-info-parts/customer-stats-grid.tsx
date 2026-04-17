import { Award, Calendar, Star } from "lucide-react"

import type { Customer } from "@/types/customer"

type CustomerStatsGridProps = {
  customer: Customer
}

export function CustomerStatsGrid({ customer }: CustomerStatsGridProps) {
  const starsEarned = Math.min(Math.floor((customer.points || 0) / 50), 5)
  
  return (
    <div className="grid grid-cols-2 gap-4 text-center">
      <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/10 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-primary/10 border border-primary/20">
        <div className="absolute -right-4 -top-4 rounded-full bg-primary/10 p-8 transition-transform duration-500 group-hover:scale-125"></div>
        
        {/* Star Display */}
        <div className="relative z-10 flex justify-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 transition-all ${
                i < starsEarned
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          ))}
        </div>
        
        <p className="relative z-10 text-2xl font-bold text-primary dark:text-primary">{(customer.points || 0).toLocaleString()}</p>
        <p className="relative z-10 text-xs text-primary/70 dark:text-primary/70 uppercase tracking-wider font-semibold mt-1">Points</p>
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
