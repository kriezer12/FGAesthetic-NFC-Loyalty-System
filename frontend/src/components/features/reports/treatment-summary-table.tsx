import { Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { TreatmentSummary } from "./types"

interface TreatmentSummaryTableProps {
  treatmentSummary: TreatmentSummary[]
  loading?: boolean
}

export function TreatmentSummaryTable({ treatmentSummary, loading }: TreatmentSummaryTableProps) {
  const totalUsed = treatmentSummary.reduce((sum, t) => sum + t.used_sessions, 0)
  const totalRemaining = treatmentSummary.reduce((sum, t) => sum + t.remaining_sessions, 0)
  const totalClients = treatmentSummary.reduce((sum, t) => sum + t.total_clients, 0)

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm transition-all duration-300">
      <CardHeader className="border-b bg-muted/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Treatment Summary</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {!loading && treatmentSummary.length > 0
                ? `${treatmentSummary.length} treatment type${treatmentSummary.length !== 1 ? 's' : ''}`
                : "Treatment packages overview"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-sm font-medium text-muted-foreground animate-pulse">Loading…</div>
        ) : treatmentSummary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-muted-foreground gap-3 bg-muted/5">
            <div className="bg-background shadow-sm rounded-full p-4 ring-1 ring-border/50">
              <Activity className="h-8 w-8 text-primary/40" />
            </div>
            <p className="text-base font-semibold text-foreground">No treatment data available</p>
            <p className="text-sm">Treatment packages will appear here once sessions are created</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/50 transition-colors hover:bg-muted/60">
                    <TableHead className="font-semibold text-foreground/80">Treatment Type</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/80">Clients</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/80">Total Sessions</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/80">Completed</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/80">Upcoming</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delayDuration={200}>
                    {treatmentSummary.map((treatment, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/40 transition-colors group">
                        <TableCell className="font-semibold">
                          {treatment.treatment_name.length > 20 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="group-hover:text-primary transition-colors cursor-help">
                                  {treatment.treatment_name.substring(0, 20)}...
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{treatment.treatment_name}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="group-hover:text-primary transition-colors">
                              {treatment.treatment_name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {treatment.clients && treatment.clients.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dashed decoration-muted-foreground/50 underline-offset-4 hover:decoration-primary transition-colors">
                                  {treatment.total_clients}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs sm:max-w-md bg-popover text-popover-foreground shadow-lg border">
                                <div className="space-y-1 p-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                                    Clients receiving {treatment.treatment_name}
                                  </p>
                                  <div className="max-h-[200px] overflow-y-auto space-y-1 px-1 custom-scrollbar">
                                    {treatment.clients.map(c => (
                                      <div key={c.id} className="text-sm border-b border-border/40 last:border-0 py-1">
                                        {c.name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            treatment.total_clients
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{treatment.total_sessions}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{treatment.used_sessions}</TableCell>
                        <TableCell className="text-right font-bold text-green-600 group-hover:text-green-500 transition-colors">
                          {treatment.remaining_sessions}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>

            <Separator className="my-0 bg-border/50" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-muted/10">
              <div className="transition-transform duration-300 hover:scale-105">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Package Types
                </p>
                <p className="text-2xl font-extrabold mt-2 text-foreground">{treatmentSummary.length}</p>
              </div>
              <div className="transition-transform duration-300 hover:scale-105">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Total Clients
                </p>
                <p className="text-2xl font-extrabold mt-2 text-foreground">{totalClients}</p>
              </div>
              <div className="transition-transform duration-300 hover:scale-105">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-2xl font-extrabold mt-2 text-foreground">{totalUsed}</p>
              </div>
              <div className="transition-transform duration-300 hover:scale-105">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Upcoming
                </p>
                <p className="text-3xl font-extrabold text-green-600 mt-2">{totalRemaining}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
