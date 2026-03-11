import { useEffect, useMemo, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight, Filter, Search, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 20

interface BranchLookup { [id: string]: string }
interface UserProfileLookup { [userId: string]: { role: string; branch_id: string | null } }

type CanonicalAction =
  | "edited_client_data"
  | "appointed_schedule"
  | "registered_new_client"
  | "changed_inventory"
  | "applied_discounts"
  | "voided_transactions"

interface UserLogRow {
  id: string
  user_id: string
  user_email?: string | null
  user_name?: string | null
  action_type: string
  entity_type?: string | null
  entity_id?: string | null
  entity_name?: string | null
  branch_id?: string | null
  changes?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

const ACTION_LABELS: Record<CanonicalAction, string> = {
  edited_client_data: "Edited Client's Data",
  appointed_schedule: "Appointed Schedule",
  registered_new_client: "Registered New Client",
  changed_inventory: "Changed Inventory",
  applied_discounts: "Applied Discounts",
  voided_transactions: "Voided Transactions",
}

const ACTION_KEYS = Object.keys(ACTION_LABELS) as CanonicalAction[]

const ACTION_ALIASES: Record<CanonicalAction, string[]> = {
  edited_client_data: ["edited_client_data", "edit_client_data", "client_updated", "update_customer", "updated_customer"],
  appointed_schedule: ["appointed_schedule", "appointment_created", "appointment_updated", "schedule_updated", "set_appointment"],
  registered_new_client: ["registered_new_client", "new_client_registered", "customer_created", "client_created", "register_client"],
  changed_inventory: ["changed_inventory", "inventory_changed", "inventory_updated", "stock_changed", "stock_adjusted"],
  applied_discounts: ["applied_discounts", "discount_applied", "applied_discount"],
  voided_transactions: ["voided_transactions", "transaction_voided", "void_transaction", "voided_transaction"],
}

const normalizeAction = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const mapToCanonicalAction = (actionType: string): CanonicalAction | null => {
  const normalized = normalizeAction(actionType)

  for (const key of ACTION_KEYS) {
    const aliases = ACTION_ALIASES[key]
    if (aliases.some((alias) => normalizeAction(alias) === normalized)) {
      return key
    }
  }

  return null
}

export default function UserLogsPage() {
  const [logs, setLogs] = useState<UserLogRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeAction, setActiveAction] = useState<CanonicalAction | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [branchMap, setBranchMap] = useState<BranchLookup>({})
  const [userProfileMap, setUserProfileMap] = useState<UserProfileLookup>({})

  useEffect(() => {
    document.title = "User Logs - FG Aesthetic Centre"
  }, [])

  useEffect(() => {
    const fetchMeta = async () => {
      const [{ data: branches }, { data: profiles }] = await Promise.all([
        supabase.from("branches").select("id, name"),
        supabase.from("user_profiles").select("id, role, branch_id"),
      ])
      const bMap: BranchLookup = {}
      for (const b of branches || []) bMap[b.id] = b.name
      setBranchMap(bMap)

      const pMap: UserProfileLookup = {}
      for (const p of profiles || []) pMap[p.id] = { role: p.role, branch_id: p.branch_id }
      setUserProfileMap(pMap)
    }
    fetchMeta()
  }, [])

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { data, error } = await supabase
          .from("user_logs")
          .select("id, user_id, user_email, user_name, action_type, entity_type, entity_id, entity_name, branch_id, changes, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(2000)

        if (error) {
          throw error
        }

        setLogs((data || []) as UserLogRow[])
      } catch (err) {
        console.error("Error loading user logs:", err)
        setLogs([])
        setErrorMessage("No user log records are available yet.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeAction, searchQuery, dateFrom, dateTo])

  const getActionLabel = (action: string) => {
    const canonical = mapToCanonicalAction(action)
    if (canonical) {
      return ACTION_LABELS[canonical]
    }

    return action
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "-"

    const d = new Date(dateString)

    if (Number.isNaN(d.getTime())) return "-"

    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const canonicalAction = mapToCanonicalAction(log.action_type)
      const actionMatch = activeAction === "all" || canonicalAction === activeAction
      if (!actionMatch) return false

      if (dateFrom) {
        const logDate = new Date(log.created_at || "")
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (logDate < from) return false
      }
      if (dateTo) {
        const logDate = new Date(log.created_at || "")
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (logDate > to) return false
      }

      if (!searchQuery.trim()) return true

      const term = searchQuery.toLowerCase()
      const who = `${log.user_name || ""} ${log.user_email || ""} ${log.user_id || ""}`.toLowerCase()
      const what = `${getActionLabel(log.action_type)} ${log.entity_type || ""} ${log.entity_name || ""}`.toLowerCase()
      const branchName = log.branch_id ? (branchMap[log.branch_id] || "").toLowerCase() : ""

      return who.includes(term) || what.includes(term) || branchName.includes(term)
    })
  }, [logs, activeAction, searchQuery, dateFrom, dateTo, branchMap])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const getRoleBadge = (userId: string) => {
    const profile = userProfileMap[userId]
    if (!profile) return null
    const { role } = profile
    if (role === "super_admin")
      return <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-400 text-purple-600">Super Admin</Badge>
    if (role === "branch_admin")
      return <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-400 text-blue-600">Branch Admin</Badge>
    return <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">Staff</Badge>
  }

  const getBranchName = (log: UserLogRow) => {
    const branchId = log.branch_id || userProfileMap[log.user_id]?.branch_id || null
    if (!branchId) return null
    return branchMap[branchId] || null
  }

  const getDetailsText = (log: UserLogRow) => {
    const details: string[] = []

    if (log.entity_type) {
      details.push(log.entity_type.replaceAll("_", " "))
    }

    if (log.entity_name) {
      details.push(log.entity_name)
    }

    if (log.entity_id) {
      details.push(`ID: ${log.entity_id}`)
    }

    if (!details.length) {
      return "-"
    }

    return details.join(" • ")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">User Logs</h1>
        <p className="text-sm text-muted-foreground">
          Who and when actions were performed across key operations.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Activity Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeAction === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveAction("all")}
            >
              All
            </Button>
            {ACTION_KEYS.map((key) => (
              <Button
                key={key}
                variant={activeAction === key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveAction(key)}
              >
                {ACTION_LABELS[key]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">From</label>
                <DatePicker
                  value={dateFrom ? new Date(dateFrom) : undefined}
                  onChange={(d) => setDateFrom(d ? d.toISOString().slice(0,10) : "")}
                  className="h-9 w-40 text-sm"
                  placeholder="Start date"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">To</label>
                <DatePicker
                  value={dateTo ? new Date(dateTo) : undefined}
                  onChange={(d) => setDateTo(d ? d.toISOString().slice(0,10) : "")}
                  className="h-9 w-40 text-sm"
                  placeholder="End date"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo("") }}>
                  Clear
                </Button>
              )}
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, action, or details..."
              className="pl-10"
            />
          </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>Who &amp; When</span>
            <span className="text-xs font-normal text-muted-foreground">
              {filteredLogs.length} result{filteredLogs.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading user logs...</p>
          ) : filteredLogs.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {errorMessage || "No user logs match your filters."}
              </p>
              <p className="text-xs text-muted-foreground">
                Expected actions: Edited Client's Data, Appointed Schedule, Registered New Client, Changed Inventory, Applied Discounts, Voided Transactions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Who / Branch</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Action</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">When</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="p-3 align-top">
                        <div className="flex items-start gap-2">
                          <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium">{log.user_name || log.user_email || "Unknown User"}</p>
                              {getRoleBadge(log.user_id)}
                            </div>
                            {log.user_name && log.user_email && (
                              <p className="text-xs text-muted-foreground">{log.user_email}</p>
                            )}
                            {getBranchName(log) && (
                              <p className="text-xs text-muted-foreground mt-0.5">📍 {getBranchName(log)}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm font-medium">{getActionLabel(log.action_type)}</td>
                      <td className="p-3 align-top">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Calendar className="mt-0.5 h-4 w-4" />
                          <span>{formatDateTime(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{getDetailsText(log)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredLogs.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredLogs.length)}–{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
