import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download } from "lucide-react"
import type { ZReadingSnapshot } from "./types"

interface ZReadingPanelProps {
  zPanelOpen: boolean
  setZPanelOpen: (open: boolean) => void
  zBusinessDate: string
  setZBusinessDate: (date: string) => void
  onXReading: () => void
  onZReadingTrigger: () => void
  zReadingReport: ZReadingSnapshot | null
  onPrintZReading: (snapshot: ZReadingSnapshot) => void
  zReadingHistory: ZReadingSnapshot[]
  paginatedZReadings: ZReadingSnapshot[]
  zHistoryPage: number
  totalZHistoryPages: number
  setZHistoryPage: (page: number) => void
  formatMoney: (value: number) => string
}

export function ZReadingPanel({
  zPanelOpen,
  setZPanelOpen,
  zBusinessDate,
  setZBusinessDate,
  onXReading,
  onZReadingTrigger,
  zReadingReport,
  onPrintZReading,
  zReadingHistory,
  paginatedZReadings,
  zHistoryPage,
  totalZHistoryPages,
  setZHistoryPage,
  formatMoney,
}: ZReadingPanelProps) {
  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">End-of-Day Z-Reading</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setZPanelOpen(!zPanelOpen)}>
          {zPanelOpen ? "Close" : "Open"}
        </Button>
      </div>

      {zPanelOpen && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Business Date</p>
              <Input
                type="date"
                value={zBusinessDate}
                onChange={(e) => setZBusinessDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onXReading}>
                X-Reading (Preview)
              </Button>
              <Button type="button" onClick={onZReadingTrigger}>
                Final Z-Reading
              </Button>
            </div>
            {zReadingReport && (
              <Button type="button" variant="ghost" onClick={() => onPrintZReading(zReadingReport)}>
                <Download className="mr-2 h-4 w-4" />
                Print Z-Reading
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            X-Reading is a preview of the day's sales. Final Z-Reading signifies the end of the operational day and can only be done once.
          </p>

          {zReadingReport && (
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <div className="rounded border p-2">
                <span className="text-muted-foreground font-medium text-xs block mb-1">Reading No.</span>
                <div className="font-semibold text-lg text-primary">#{zReadingReport.readingNo}</div>
              </div>
              <div className="rounded border p-2">
                <span className="text-muted-foreground font-medium text-xs block mb-1">Net Sales</span>
                <div className="font-semibold text-lg">{formatMoney(zReadingReport.netSales)}</div>
              </div>
              <div className="rounded border p-2">
                <span className="text-muted-foreground font-medium text-xs block mb-1">Transaction Count</span>
                <div className="font-semibold text-lg">{zReadingReport.txCount}</div>
              </div>
            </div>
          )}

          {zReadingHistory.length > 0 && (
            <>
              <div className="rounded-md border overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Reading No</th>
                      <th className="px-3 py-2 text-left">Branch</th>
                      <th className="px-3 py-2 text-left">Business Date</th>
                      <th className="px-3 py-2 text-right">Net Sales</th>
                      <th className="px-3 py-2 text-right">Tx Count</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedZReadings.map((z) => (
                      <tr key={`${z.readingNo}-${z.generatedAt}`} className="border-t">
                        <td className="px-3 py-2 font-medium">#{z.readingNo}</td>
                        <td className="px-3 py-2">{z.branchName}</td>
                        <td className="px-3 py-2">{z.businessDate}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(z.netSales)}</td>
                        <td className="px-3 py-2 text-right">{z.txCount}</td>
                        <td className="px-3 py-2 text-right">
                          <Button type="button" size="sm" variant="outline" onClick={() => onPrintZReading(z)}>
                            Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Page {zHistoryPage} of {totalZHistoryPages}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={zHistoryPage <= 1}
                    onClick={() => setZHistoryPage(Math.max(1, zHistoryPage - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={zHistoryPage >= totalZHistoryPages}
                    onClick={() => setZHistoryPage(Math.min(totalZHistoryPages, zHistoryPage + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
