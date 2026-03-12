import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type ReportType = "full" | "clients" | "treatments"

interface ExportSectionProps {
  exporting: boolean
  loading: boolean
  onExport: (reportType: ReportType) => void
}

export function ExportSection({ exporting, loading, onExport }: ExportSectionProps) {
  return (
    <Card className="sticky top-6 h-fit bg-card/40 backdrop-blur-md border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Export Data
        </CardTitle>
        <p className="text-xs text-muted-foreground font-medium mt-1">
          Download reports as CSV files
        </p>
      </CardHeader>
      <Separator className="mb-4 bg-border/50" />
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start text-sm transition-all duration-300 hover:bg-muted/50 hover:pl-5 border-border/50"
          onClick={() => onExport("full")}
          disabled={exporting || loading}
        >
          <Download className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground transition-all duration-300 group-hover:text-primary" />
          <span className="truncate font-medium">Full Report</span>
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-sm transition-all duration-300 hover:bg-muted/50 hover:pl-5 border-border/50"
          onClick={() => onExport("clients")}
          disabled={exporting || loading}
        >
          <Download className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground transition-all duration-300 group-hover:text-primary" />
          <span className="truncate font-medium">Clients Summary</span>
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-sm transition-all duration-300 hover:bg-muted/50 hover:pl-5 border-border/50"
          onClick={() => onExport("treatments")}
          disabled={exporting || loading}
        >
          <Download className={`h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground transition-all duration-300 group-hover:text-primary ${exporting ? "animate-bounce" : ""}`} />
          <span className="truncate font-medium">
            {exporting ? "Exporting..." : "Treatments"}
          </span>
        </Button>
        
        <Separator className="my-3 bg-border/50" />
        
        <p className="text-xs text-muted-foreground text-center py-2 font-medium">
          {exporting ? "Processing your export..." : "CSV format for easy sharing"}
        </p>
      </CardContent>
    </Card>
  )
}
