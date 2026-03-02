import { useCallback, useEffect, useState } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  User,
  Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

interface CheckinLogWithCustomer {
  id: string
  customer_id: string
  checked_in_at: string
  points_added: number
  notes?: string
  customers?: {
    name?: string
    first_name?: string
    last_name?: string
  }
}

const LOGS_PER_PAGE = 10

export default function CheckinLogsPage() {
  const [logs, setLogs] = useState<CheckinLogWithCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error, count } = await supabase
        .from("checkin_logs")
        .select(`
          id,
          customer_id,
          checked_in_at,
          points_added,
          notes,
          customers (
            name,
            first_name,
            last_name
          )
        `, { count: "exact" })
        .order("checked_in_at", { ascending: false })
        .range(currentPage * LOGS_PER_PAGE, (currentPage + 1) * LOGS_PER_PAGE - 1)

      if (error) throw error

      setTotalCount(count || 0)
      setLogs((data as unknown as CheckinLogWithCustomer[]) || [])
    } catch (err) {
      console.error("Error fetching check-in logs:", err)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    document.title = "Check-in Logs - FG Aesthetic Centre"
    fetchLogs()
  }, [fetchLogs])

  const getCustomerName = (log: CheckinLogWithCustomer) => {
    if (log.customers?.name) return log.customers.name
    const first = log.customers?.first_name || ""
    const last = log.customers?.last_name || ""
    return `${first} ${last}`.trim() || "Unknown Customer"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredLogs = searchQuery
    ? logs.filter((log) => {
        const name = getCustomerName(log).toLowerCase()
        return name.includes(searchQuery.toLowerCase())
      })
    : logs

  const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE)
  const todayCount = logs.filter(
    (log) => new Date(log.checked_in_at).toDateString() === new Date().toDateString()
  ).length

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Check-ins</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Check-ins</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Page</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentPage + 1} / {totalPages || 1}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left font-medium">Customer</th>
                    <th className="p-4 text-left font-medium">Date</th>
                    <th className="p-4 text-left font-medium">Time</th>
                    <th className="p-4 text-left font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        Loading check-in logs...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No check-in logs found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{getCustomerName(log)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(log.checked_in_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatTime(log.checked_in_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`font-semibold ${log.points_added > 0 ? "text-primary" : log.points_added < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {log.points_added > 0 ? "+" : ""}{log.points_added} pts
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
      </div>
    </div>
  )
}
