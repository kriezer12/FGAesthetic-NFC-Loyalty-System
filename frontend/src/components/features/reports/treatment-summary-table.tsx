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
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>
          Treatment Summary
          {!loading && treatmentSummary.length > 0 && ` (${treatmentSummary.length} types)`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : treatmentSummary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Activity className="h-8 w-8" />
            <p className="text-sm">No treatment data available</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treatment Type</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                    <TableHead className="text-right">Total Sessions</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Upcoming</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatmentSummary.map((treatment, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {treatment.treatment_name}
                      </TableCell>
                      <TableCell className="text-right">{treatment.total_clients}</TableCell>
                      <TableCell className="text-right">{treatment.total_sessions}</TableCell>
                      <TableCell className="text-right">{treatment.used_sessions}</TableCell>
                      <TableCell className="text-right font-medium">
                        {treatment.remaining_sessions}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Package Types</p>
                <p className="text-xl font-bold">{treatmentSummary.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Clients</p>
                <p className="text-xl font-bold">{totalClients}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed Sessions</p>
                <p className="text-xl font-bold">{totalUsed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Upcoming Sessions</p>
                <p className="text-xl font-bold">{totalRemaining}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
