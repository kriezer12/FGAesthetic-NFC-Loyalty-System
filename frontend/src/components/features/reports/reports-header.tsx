import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReportsHeaderProps {
  loading: boolean
  onRefresh: () => void
}

export function ReportsHeader({ loading, onRefresh }: ReportsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex-1">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
          Reports
        </h1>
        <p className="text-sm md:text-base text-muted-foreground font-medium">
          View business metrics, client data, and treatment summaries
        </p>
      </div>

      <Button
        variant="outline"
        size="default"
        onClick={onRefresh}
        disabled={loading}
        className="group flex items-center gap-2 rounded-full px-6 shadow-sm hover:shadow hover:bg-background/80 transition-all duration-300 border-primary/20 hover:border-primary/50"
      >
        <RefreshCw className={`h-4 w-4 text-primary transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
        <span className="font-semibold">Refresh Data</span>
      </Button>
    </div>
  )
}
