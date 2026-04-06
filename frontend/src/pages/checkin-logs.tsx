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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useBranches } from "@/hooks/use-branches"

interface CheckinLogWithCustomer {
  id: string
  customer_id: string
  checked_in_at: string
  points_added: number
  notes?: string
  [key: string]: unknown
  customers?: {
    name?: string
    first_name?: string
    last_name?: string
  }
}

interface PreviousLog {
  id: string
  checked_in_at: string
  points_added: number
  notes?: string
}

const LOGS_PER_PAGE = 10

export default function CheckinLogsPage() {
  const { userProfile } = useAuth()
  const { branches, fetchAll } = useBranches()
  const isSuperAdmin = userProfile?.role === "super_admin"

  const [logs, setLogs] = useState<CheckinLogWithCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  // Initialize filter with 'all' for super_admin or user's assigned branch otherwise
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedLog, setSelectedLog] = useState<CheckinLogWithCustomer | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [selectedBranchName, setSelectedBranchName] = useState("Unknown Branch")
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("Unknown Employee")
  const [previousLogs, setPreviousLogs] = useState<PreviousLog[]>([])

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAll()
    } else if (userProfile?.branch_id) {
      setBranchFilter(userProfile.branch_id)
    }
  }, [isSuperAdmin, userProfile, fetchAll])

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from("checkin_logs")
        .select(`
          id,
          customer_id,
          checked_in_at,
          points_added,
          notes,
          branch_id,
          customers (
            name,
            first_name,
            last_name
          )
        `, { count: "exact" })
      
      if (branchFilter !== "all" && branchFilter !== "NA") {
        query = query.eq("branch_id", branchFilter)
      } else if (!isSuperAdmin && userProfile?.branch_id) {
        query = query.eq("branch_id", userProfile.branch_id)
      }

      const { data, error, count } = await query
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
  }, [currentPage, branchFilter, isSuperAdmin, userProfile])

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

  const getStringField = (row: CheckinLogWithCustomer, keys: string[]) => {
    for (const key of keys) {
      const value = row[key]
      if (typeof value === "string" && value.trim()) {
        return value.trim()
      }
    }
    return undefined
  }

  const resolveBranchName = async (log: CheckinLogWithCustomer) => {
    const branchName = getStringField(log, ["branch_name", "branch", "processed_branch"])
    if (branchName) return branchName

    const branchId = getStringField(log, ["branch_id"])
    if (!branchId) return "Unknown Branch"

    const { data } = await supabase
      .from("branches")
      .select("name")
      .eq("id", branchId)
      .maybeSingle()

    if (!data || typeof data.name !== "string" || !data.name.trim()) {
      return "Unknown Branch"
    }

    return data.name
  }

  const resolveEmployeeName = async (log: CheckinLogWithCustomer) => {
    const employeeName = getStringField(log, [
      "processed_by_name",
      "employee_name",
      "staff_name",
      "processed_by",
    ])
    if (employeeName) return employeeName

    const employeeId = getStringField(log, ["processed_by", "processed_by_id", "employee_id", "staff_id", "user_id"])
    if (!employeeId) return "Unknown Employee"

    const { data } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", employeeId)
      .maybeSingle()

    if (!data) return "Unknown Employee"

    if (typeof data.full_name === "string" && data.full_name.trim()) {
      return data.full_name
    }

    if (typeof data.email === "string" && data.email.trim()) {
      return data.email
    }

    return "Unknown Employee"
  }

  const openLogDetails = async (log: CheckinLogWithCustomer) => {
    setIsDetailsOpen(true)
    setIsDetailsLoading(true)
    setDetailsError(null)
    setSelectedLog(log)
    setSelectedBranchName("Unknown Branch")
    setSelectedEmployeeName("Unknown Employee")
    setPreviousLogs([])

    try {
      const { data: fullLog, error: fullLogError } = await supabase
        .from("checkin_logs")
        .select("*")
        .eq("id", log.id)
        .maybeSingle()

      if (fullLogError) throw fullLogError

      const mergedLog = {
        ...log,
        ...((fullLog || {}) as CheckinLogWithCustomer),
      }

      setSelectedLog(mergedLog)

      const [branchName, employeeName] = await Promise.all([
        resolveBranchName(mergedLog),
        resolveEmployeeName(mergedLog),
      ])

      setSelectedBranchName(branchName)
      setSelectedEmployeeName(employeeName)

      const { data: customerLogs, error: previousLogsError } = await supabase
        .from("checkin_logs")
        .select("id, checked_in_at, points_added, notes")
        .eq("customer_id", mergedLog.customer_id)
        .order("checked_in_at", { ascending: false })
        .limit(11)

      if (previousLogsError) throw previousLogsError

      const history = ((customerLogs || []) as PreviousLog[])
        .filter((entry) => entry.id !== mergedLog.id)
        .slice(0, 10)

      setPreviousLogs(history)
    } catch (err) {
      console.error("Error loading check-in details:", err)
      setDetailsError("Unable to load check-in details right now.")
    } finally {
      setIsDetailsLoading(false)
    }
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

{/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer name..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isSuperAdmin && (
          <div className="w-[200px]">
            <Select
              value={branchFilter}
              onValueChange={(val) => {
                setBranchFilter(val)
                setCurrentPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="NA">No Branch</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
          </div>

          {/* Logs Table */}
          <div className="rounded-lg border bg-card">
            <div className="border-b bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
              Click a log entry to view branch, employee, and previous check-ins.
            </div>
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
                      <tr
                        key={log.id}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                        onClick={() => openLogDetails(log)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openLogDetails(log)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${getCustomerName(log)}`}
                      >
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b px-6 pt-6 pb-4">
            <DialogTitle>
              {selectedLog ? `${getCustomerName(selectedLog)} Check-in Details` : "Check-in Details"}
            </DialogTitle>
            <DialogDescription>
              Extra details about this check-in and the customer&apos;s previous logs.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
            {isDetailsLoading ? (
              <p className="text-sm text-muted-foreground">Loading details...</p>
            ) : detailsError ? (
              <p className="text-sm text-destructive">{detailsError}</p>
            ) : selectedLog ? (
              <>
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Processed Branch</p>
                    <p className="mt-1 font-medium">{selectedBranchName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Processed By</p>
                    <p className="mt-1 font-medium">{selectedEmployeeName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="mt-1 font-medium">{formatDate(selectedLog.checked_in_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Time</p>
                    <p className="mt-1 font-medium">{formatTime(selectedLog.checked_in_at)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold">Customer Previous Logs</h3>
                  {previousLogs.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No previous logs found for this customer.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                            <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Time</th>
                            <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previousLogs.map((entry) => (
                            <tr key={entry.id} className="border-b last:border-b-0">
                              <td className="p-3 text-sm">{formatDate(entry.checked_in_at)}</td>
                              <td className="p-3 text-sm text-muted-foreground">{formatTime(entry.checked_in_at)}</td>
                              <td className="p-3 text-sm font-medium">
                                <span className={entry.points_added > 0 ? "text-primary" : entry.points_added < 0 ? "text-destructive" : "text-muted-foreground"}>
                                  {entry.points_added > 0 ? "+" : ""}{entry.points_added} pts
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
