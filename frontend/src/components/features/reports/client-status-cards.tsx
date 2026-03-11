import { Users, Activity, Archive, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ClientCounts } from "./types"

interface ClientStatusCardsProps {
  clientCounts: ClientCounts | null
  loading: boolean
}

export function ClientStatusCards({ clientCounts, loading }: ClientStatusCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? "—" : clientCounts?.active_count ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Last 60 days activity</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Inactive Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? "—" : clientCounts?.inactive_count ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">No activity &gt; 60 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? "—" : clientCounts?.archived_count ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Marked as archived</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Total Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? "—" : clientCounts?.total_count ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">All registered clients</p>
        </CardContent>
      </Card>
    </div>
  )
}
