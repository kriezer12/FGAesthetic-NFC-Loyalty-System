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
    <Card>
      <CardContent className="pt-8 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No data available yet</p>
      </CardContent>
    </Card>
  )
}
