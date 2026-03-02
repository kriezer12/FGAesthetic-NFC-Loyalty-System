import * as React from "react"
import { supabase } from "@/lib/supabase"
import { CheckinHistoryEmpty, CheckinHistoryLoading } from "./checkin-history-parts/checkin-history-states"
import { CheckinHistoryList } from "./checkin-history-parts/checkin-history-list"

import type { CheckinLog } from "./checkin-history-parts/checkin-history.types"

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

  if (isLoading) {
    return <CheckinHistoryLoading />
  }

  if (logs.length === 0) {
    return <CheckinHistoryEmpty />
  }

  return <CheckinHistoryList logs={logs} />
}
