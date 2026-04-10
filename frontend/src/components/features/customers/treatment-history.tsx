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

  const renderChanges = (changes: any) => {
    if (!changes || typeof changes !== 'object') {
      return <div className="text-xs text-muted-foreground">Modified treatment record</div>
    }

    const changeBlocks = Object.entries(changes).map(([k, change]: [string, any]) => {
      const o = change.old
      const n = change.new
      
      // If treatment was added
      if (!o && n && n.name) {
        return <div key={k} className="text-sm">Added <strong>{n.name}</strong> ({n.total_sessions} sessions)</div>
      }
      // If treatment was removed
      if (o && !n && o.name) {
        return <div key={k} className="text-sm border-l-2 border-red-500 pl-2 text-muted-foreground">Removed <strong>{o.name}</strong></div>
      }
      // If modified
      if (o && n && o.name) {
        const detailChanges = []
        if (o.used_sessions !== n.used_sessions) {
          const diff = n.used_sessions > o.used_sessions ? `+${n.used_sessions - o.used_sessions}` : `${n.used_sessions - o.used_sessions}`
          detailChanges.push(
            <span key="used" className="font-medium text-blue-600 dark:text-blue-400">
              Used sessions: {o.used_sessions} → {n.used_sessions} ({diff})
            </span>
          )
        }
        if (o.remaining_sessions !== n.remaining_sessions) {
          detailChanges.push(
            <span key="rem" className="font-medium">Remaining: {o.remaining_sessions} → {n.remaining_sessions}</span>
          )
        }
        if (o.total_sessions !== n.total_sessions) {
          detailChanges.push(<span key="tot" className="font-medium">Total: {o.total_sessions} → {n.total_sessions}</span>)
        }
        
        if (detailChanges.length === 0) return null

        return (
          <div key={k} className="text-sm bg-muted/30 p-2 rounded border border-border/50">
            <div className="font-semibold mb-1">{o.name}</div>
            <div className="flex flex-col gap-1 text-xs">
              {detailChanges.map((change, i) => (
                <div key={i}>{change}</div>
              ))}
            </div>
          </div>
        )
      }
      
      return null
    }).filter(Boolean)

    if (changeBlocks.length === 0) {
      return <div className="text-xs text-muted-foreground italic">No session counts were modified.</div>
    }

    return <div className="space-y-2 mt-2">{changeBlocks}</div>
  }

  return (
    <div className="space-y-3">
      {logs.map((l) => (
        <div key={l.id} className="p-3 border rounded-lg bg-card">
          <div className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {new Date(l.created_at).toLocaleString(undefined, { 
              month: 'short', day: 'numeric', year: 'numeric', 
              hour: 'numeric', minute: '2-digit' 
            })}
          </div>
          {renderChanges(l.changes)}
        </div>
      ))}
    </div>
  )
}
