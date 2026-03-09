import * as React from "react"
import { supabase } from "@/lib/supabase"
import { CheckinHistoryEmpty, CheckinHistoryLoading } from "./checkin-history-parts/checkin-history-states"
import type { TreatmentLog } from "@/types/customer"

interface TreatmentHistoryProps {
  customerId: string
  refreshKey?: number
}

export function TreatmentHistory({ customerId, refreshKey = 0 }: TreatmentHistoryProps) {
  const [logs, setLogs] = React.useState<TreatmentLog[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("treatment_logs")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(10)

        if (!error && data) {
          setLogs(data as TreatmentLog[])
        }
      } catch (err) {
        console.error("Error fetching treatment logs:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [customerId, refreshKey])

  if (isLoading) {
    return <CheckinHistoryLoading />
  }

  if (logs.length === 0) {
    return <CheckinHistoryEmpty message="No treatment activity yet" />
  }

  return (
    <div className="space-y-2">
      {logs.map((l) => (
        <div key={l.id} className="p-2 border rounded">
          <div className="text-xs text-muted-foreground">
            {new Date(l.created_at).toLocaleString()}
          </div>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(l.changes, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}
