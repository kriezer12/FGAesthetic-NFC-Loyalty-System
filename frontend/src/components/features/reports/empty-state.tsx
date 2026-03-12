import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ClientCounts } from "./types"

interface EmptyStateProps {
  loading: boolean
  clientCounts: ClientCounts | null
}

export function EmptyState({ loading, clientCounts }: EmptyStateProps) {
  if (loading || !clientCounts || clientCounts.total_count !== 0) return null

  return (
    <Card className="border-dashed border-2 bg-muted/10 border-muted-foreground/20 hover:bg-muted/20 transition-colors duration-300">
      <CardContent className="pt-16 pb-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-background shadow-sm rounded-full p-6 ring-1 ring-border/50">
            <FileText className="h-10 w-10 text-primary/60" />
          </div>
        </div>
        <p className="text-xl font-bold tracking-tight text-foreground mb-2">No data available yet</p>
        <p className="text-base text-muted-foreground max-w-md mx-auto">
          Reports will appear here once you start registering clients and creating appointments.
        </p>
      </CardContent>
    </Card>
  )
}
