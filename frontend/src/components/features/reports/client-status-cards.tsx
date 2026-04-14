import { Users, Activity, Archive, TrendingUp, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ClientCounts, TopStaffSales } from "./types"

interface ClientStatusCardsProps {
  clientCounts: ClientCounts | null
  topStaffSales?: TopStaffSales | null
  loading: boolean
}

export function ClientStatusCards({ clientCounts, topStaffSales, loading }: ClientStatusCardsProps) {
  const cards = [
    {
      icon: Users,
      label: "Active Clients",
      value: clientCounts?.active_count ?? 0,
      description: "Last 60 days activity",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Activity,
      label: "Inactive Clients",
      value: clientCounts?.inactive_count ?? 0,
      description: "No activity > 60 days",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Archive,
      label: "Archived Clients",
      value: clientCounts?.archived_count ?? 0,
      description: "Marked as archived",
      color: "text-slate-600",
      bgColor: "bg-slate-50",
    },
    {
      icon: TrendingUp,
      label: "Total Clients",
      value: clientCounts?.total_count ?? 0,
      description: "All registered clients",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Trophy,
      label: "Top Sales Staff",
      value: topStaffSales 
        ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(topStaffSales.total_sales) 
        : "—",
      description: topStaffSales 
        ? `${topStaffSales.staff_name} (${topStaffSales.completed_appointments} appts)` 
        : "No completed appointments",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon
        return (
          <Card key={card.label} className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.label}
                </CardTitle>
                <div className={`${card.bgColor} p-2 rounded-xl ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">
                {loading ? "—" : card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
