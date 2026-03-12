import { Archive } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ArchivedClient } from "./types"

interface ArchivedClientsTableProps {
  archivedClients: ArchivedClient[]
}

function getClientName(client: ArchivedClient): string {
  if (client.name) return client.name
  const first = client.first_name || ""
  const last = client.last_name || ""
  return `${first} ${last}`.trim() || "Unknown"
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function ArchivedClientsTable({ archivedClients }: ArchivedClientsTableProps) {
  if (archivedClients.length === 0) return null

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm transition-all duration-300">
      <CardHeader className="border-b bg-muted/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Archive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Archived Clients</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {archivedClients.length} client{archivedClients.length !== 1 ? 's' : ''} archived
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold">Email</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Phone</TableHead>
                <TableHead className="text-right font-semibold">Visits</TableHead>
                <TableHead className="text-right font-semibold">Points</TableHead>
                <TableHead className="font-semibold">Archived Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap">
                    {getClientName(client)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {client.email || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {client.phone || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{client.visits || 0}</TableCell>
                  <TableCell className="text-right font-medium">{client.points || 0}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {formatDate(client.archived_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
