import * as React from "react"
import { Calendar, Clock, Award, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

import type { CheckinLog } from "@/types/customer"

interface CheckinHistoryProps {
  customerId: string
  refreshKey?: number
}

export function CheckinHistory({ customerId, refreshKey = 0 }: CheckinHistoryProps) {
  const [logs, setLogs] = React.useState<CheckinLog[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("checkin_logs")
          .select("*")
          .eq("customer_id", customerId)
          .order("checked_in_at", { ascending: false })
          .limit(10)

        if (!error && data) {
          setLogs(data)
        }
      } catch (err) {
        console.error("Error fetching check-in logs:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [customerId, refreshKey])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No check-in history found.
      </p>
    )
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(log.checked_in_at)}</span>
            <span className="text-muted-foreground">•</span>
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{formatTime(log.checked_in_at)}</span>
          </div>
          {log.points_added !== 0 && (
            <span className={`font-medium ${log.points_added > 0 ? "text-primary" : "text-destructive"}`}>
              {log.points_added > 0 ? "+" : ""}{log.points_added} pts
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
