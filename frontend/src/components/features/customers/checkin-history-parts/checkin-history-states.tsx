import { Loader2 } from "lucide-react"

export function CheckinHistoryLoading() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}

export function CheckinHistoryEmpty() {
  return (
    <p className="text-sm text-muted-foreground text-center py-4">
      No check-in history found.
    </p>
  )
}
