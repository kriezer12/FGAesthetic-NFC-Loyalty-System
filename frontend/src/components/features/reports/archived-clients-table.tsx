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
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Archived Clients ({archivedClients.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Archived Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {getClientName(client)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {client.email || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {client.phone || "—"}
                  </TableCell>
                  <TableCell className="text-right">{client.visits || 0}</TableCell>
                  <TableCell className="text-right">{client.points || 0}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
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
