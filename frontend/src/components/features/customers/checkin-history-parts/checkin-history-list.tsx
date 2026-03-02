import { Calendar, Clock } from "lucide-react"

import type { CheckinLog } from "./checkin-history.types"
import { formatCheckinDate, formatCheckinTime } from "./checkin-history-format"

type CheckinHistoryListProps = {
  logs: CheckinLog[]
}

export function CheckinHistoryList({ logs }: CheckinHistoryListProps) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatCheckinDate(log.checked_in_at)}</span>
            <span className="text-muted-foreground">•</span>
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{formatCheckinTime(log.checked_in_at)}</span>
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
