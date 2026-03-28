import * as React from "react"
import { Calendar, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { formatCheckinDate, formatCheckinTime } from "../checkin-history-parts/checkin-history-format"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PointsTransaction {
  id: string
  customer_id: string
  points_change: number
  reason: string
  type: string
  created_at: string
  expires_at?: string | null
}

interface PointsHistoryProps {
  customerId: string
  refreshKey?: number
}

export function PointsHistory({ customerId, refreshKey = 0 }: PointsHistoryProps) {
  const [logs, setLogs] = React.useState<PointsTransaction[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("points_transactions")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(10)

        if (!error && data) {
          setLogs(data)
        }
      } catch (err) {
        console.error("Error fetching points transactions:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [customerId, refreshKey])

  if (isLoading) {
    return (
      <div className="flex animate-pulse items-center gap-2 p-4 pt-0">
        <div className="h-4 w-4 bg-muted rounded-full" />
        <div className="h-4 w-1/3 bg-muted rounded" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground border rounded-md border-dashed">
        No points history yet
      </div>
    )
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2 px-1">Points History</h4>
      <ScrollArea className="h-48 px-1">
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
            >
              <div className="flex flex-col">
              <div className="font-medium">{log.reason}</div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{formatCheckinDate(log.created_at)}</span>
                  <span className="text-muted-foreground">•</span>
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{formatCheckinTime(log.created_at)}</span>
                </div>
              </div>
              <span className={`font-medium ${log.points_change > 0 ? "text-green-500" : "text-destructive"}`}>
                {log.points_change > 0 ? "+" : ""}{log.points_change} pts
                {log.type === 'earn' && log.expires_at && (
                  <div className="text-[10px] text-muted-foreground font-normal text-right">
                    Exp: {new Date(log.expires_at).toLocaleDateString()}
                  </div>
                )}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
