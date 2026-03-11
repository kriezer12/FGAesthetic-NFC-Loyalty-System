import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ReportType = "full" | "clients" | "treatments"

interface ExportSectionProps {
  exporting: boolean
  loading: boolean
  onExport: (reportType: ReportType) => void
}

export function ExportSection({ exporting, loading, onExport }: ExportSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Export Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onExport("full")}
            disabled={exporting || loading}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Full Report (CSV)"}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onExport("clients")}
            disabled={exporting || loading}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Client Summary (CSV)"}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onExport("treatments")}
            disabled={exporting || loading}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Treatment Summary (CSV)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
