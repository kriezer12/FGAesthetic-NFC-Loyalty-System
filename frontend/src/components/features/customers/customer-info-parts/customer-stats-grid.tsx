import { Award, Calendar } from "lucide-react"

import type { Customer } from "@/types/customer"

type CustomerStatsGridProps = {
  customer: Customer
}

export function CustomerStatsGrid({ customer }: CustomerStatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 text-center">
      <div className="rounded-lg bg-primary/10 p-4">
        <Award className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-3xl font-bold text-primary">{customer.points || 0}</p>
        <p className="text-xs text-muted-foreground">Points</p>
      </div>
      <div className="rounded-lg bg-secondary p-4">
        <Calendar className="h-6 w-6 text-secondary-foreground mx-auto mb-2" />
        <p className="text-3xl font-bold">{customer.visits || 0}</p>
        <p className="text-xs text-muted-foreground">Visits</p>
      </div>
    </div>
  )
}
