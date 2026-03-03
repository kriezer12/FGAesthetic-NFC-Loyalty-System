import { Award, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

import type { Customer } from "@/types/customer"

type CustomerStatsGridProps = {
  customer: Customer
}

export function CustomerStatsGrid({ customer }: CustomerStatsGridProps) {
  return (
    <div className="flex flex-col gap-6 h-full">
      <Card className="flex-1 flex items-center justify-center rounded-2xl bg-primary/10 border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Award className="h-16 w-16 text-primary mb-4" />
          <p className="text-7xl font-extrabold text-primary tracking-tight">{customer.points || 0}</p>
          <p className="text-lg text-muted-foreground mt-2 font-medium">Points</p>
        </CardContent>
      </Card>
      <Card className="flex-1 flex items-center justify-center rounded-2xl bg-secondary border-secondary/50">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Calendar className="h-16 w-16 text-secondary-foreground mb-4" />
          <p className="text-7xl font-extrabold text-secondary-foreground tracking-tight">{customer.visits || 0}</p>
          <p className="text-lg text-muted-foreground mt-2 font-medium">Total Visits</p>
        </CardContent>
      </Card>
    </div>
  )
}
