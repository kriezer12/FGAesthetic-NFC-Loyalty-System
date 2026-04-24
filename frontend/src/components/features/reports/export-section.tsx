import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

type ReportType = "full" | "clients" | "treatments" | "appointments"

interface ExportSectionProps {
  exporting: boolean
  loading: boolean
  onExport: (reportType: ReportType) => void
}

export function ExportSection({ exporting, loading, onExport }: ExportSectionProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-3 px-2">
        <div className="p-2.5 bg-primary/10 rounded-xl transition-colors group-hover:bg-primary/20">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground tracking-tight">Export Data</h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            {exporting ? "Processing your export..." : "Download reports as CSV"}
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 md:flex-none transition-all duration-300 hover:bg-muted hover:border-primary/50"
          onClick={() => onExport("full")}
          disabled={exporting || loading}
        >
          <Download className="h-4 w-4 mr-2 text-muted-foreground" />
          Full Report
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 md:flex-none transition-all duration-300 hover:bg-muted hover:border-primary/50"
          onClick={() => onExport("clients")}
          disabled={exporting || loading}
        >
          <Download className="h-4 w-4 mr-2 text-muted-foreground" />
          Clients
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 md:flex-none transition-all duration-300 hover:bg-muted hover:border-primary/50"
          onClick={() => onExport("treatments")}
          disabled={exporting || loading}
        >
          <Download className={`h-4 w-4 mr-2 text-muted-foreground ${exporting ? "animate-bounce text-primary" : ""}`} />
          {exporting ? "Exporting..." : "Treatments"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 md:flex-none transition-all duration-300 hover:bg-muted hover:border-primary/50"
          onClick={() => onExport("appointments")}
          disabled={exporting || loading}
        >
          <Download className="h-4 w-4 mr-2 text-muted-foreground" />
          Appointments
        </Button>
      </div>
    </div>
  )
}
