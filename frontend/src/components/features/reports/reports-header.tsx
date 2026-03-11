import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReportsHeaderProps {
  loading: boolean
  onRefresh: () => void
}

export function ReportsHeader({ loading, onRefresh }: ReportsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Reports</h1>
        <p className="text-muted-foreground">Business and operational insights</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  )
}
