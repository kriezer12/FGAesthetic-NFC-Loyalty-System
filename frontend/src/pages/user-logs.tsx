import React, { useEffect, useMemo, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight, Filter, Search, User, RefreshCw, LayoutGrid, Users, Package, CreditCard, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 10

interface BranchLookup { [id: string]: string }
interface UserProfileLookup {
  [userId: string]: {
    role: string
    branch_id: string | null
    full_name?: string | null
    email?: string | null
  }
}

type CanonicalAction =
  | "edited_client_data"
  | "appointed_schedule"
  | "registered_new_client"
  | "changed_inventory"
  | "inventory_restock"
  | "inventory_usage"
  | "inventory_adjustment"
  | "inventory_transfer"
  | "inventory_product_create"
  | "inventory_product_update"
  | "inventory_product_delete"
  | "completed_sale"
  | "refunded_sale"
  | "applied_discounts"
  | "voided_transactions"
  | "managed_users"
  | "managed_branches"
  | "managed_services"
  | "processed_transaction"
  | "check_in_scanned"

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
  edited_client_data: "Edited Client Data",
  appointed_schedule: "Appointed Schedule",
  registered_new_client: "Registered New Client",
  changed_inventory: "Changed Inventory",
  inventory_restock: "Restock (In)",
  inventory_usage: "Usage (Out)",
  inventory_adjustment: "Manual Adjustment",
  inventory_transfer: "Branch Transfer",
  inventory_product_create: "Added Product",
  inventory_product_update: "Updated Product",
  inventory_product_delete: "Deleted Product",
  applied_discounts: "Applied Discounts",
  voided_transactions: "Voided Transactions",
  managed_users: "Managed Users",
  managed_branches: "Managed Branches",
  managed_services: "Managed Services",  "completed_sale": "Completed Sale",
  "refunded_sale": "Refunded Sale",  processed_transaction: "Processed Transaction",
  check_in_scanned: "Check In",
}

const ACTION_KEYS = Object.keys(ACTION_LABELS) as CanonicalAction[]

const ACTION_ALIASES: Record<CanonicalAction, string[]> = {
  edited_client_data: ["edited_client_data", "edit_client_data", "client_updated", "update_customer", "updated_customer"],
  appointed_schedule: ["appointed_schedule", "appointment_created", "appointment_updated", "schedule_updated", "set_appointment"],
  registered_new_client: ["registered_new_client", "new_client_registered", "customer_created", "client_created", "register_client"],
  changed_inventory: ["changed_inventory", "inventory_changed", "inventory_updated", "stock_changed", "stock_adjusted", "added_product"],
  // NOTE: Detailed inventory aliases aren't strictly necessary here because we check metadata for inventory actions explicitly.
  inventory_restock: [], inventory_usage: [], inventory_adjustment: [], inventory_transfer: [], inventory_product_create: [], inventory_product_update: [], inventory_product_delete: [],
  applied_discounts: ["applied_discounts", "discount_applied", "applied_discount"],
  voided_transactions: ["voided_transactions", "transaction_voided", "void_transaction", "voided_transaction"],
  managed_users: ["managed_users", "user_managed", "updated_user", "created_user"],
  managed_branches: ["managed_branches", "branch_managed", "updated_branch", "created_branch"],
  managed_services: ["managed_services", "service_managed", "updated_service", "created_service"],
  completed_sale: ["completed_sale", "sale_completed", "transaction_completed", "checkout_completed"],
  refunded_sale: ["refunded_sale", "sale_refunded", "transaction_refunded"],
  processed_transaction: ["processed_transaction", "transaction_processed", "checkout", "payment"],
  check_in_scanned: ["check_in_scanned", "check_in", "scan_nfc", "customer_checked_in"],
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Clients": Users,
  "Appointments": Calendar,
  "Inventory": Package,
  "POS & Transactions": CreditCard,
  "System": Settings,
}

const CATEGORY_DEFINITIONS = [
  {
    id: "Clients",
    actions: [
      { id: "check_in_scanned", label: "Check In" },
      { id: "registered_new_client", label: "Registered New Client" },
      { id: "edited_client_data", label: "Edited Client Data" },
    ]
  },
  {
    id: "Appointments",
    actions: [
      { id: "appointed_schedule", label: "Appointed Schedule" },
    ]
  },
  {
    id: "Inventory",
    actions: [
      { id: "inventory_restock", label: "Restock (In)" },
      { id: "inventory_usage", label: "Usage (Out)" },
      { id: "inventory_adjustment", label: "Manual Adjustment" },
      { id: "inventory_transfer", label: "Branch Transfer" },
      { id: "inventory_product_create", label: "Added Product" },
      { id: "inventory_product_update", label: "Updated Product" },
      { id: "inventory_product_delete", label: "Deleted Product" },
    ]
  },
  {
    id: "POS & Transactions",
    actions: [
      { id: "processed_transaction", label: "Processed Transaction" },
      { id: "completed_sale", label: "Completed Sale" },
      { id: "refunded_sale", label: "Refunded Sale" },
      { id: "applied_discounts", label: "Applied Discounts" },
      { id: "voided_transactions", label: "Voided Transactions" },
    ]
  },
  {
    id: "System",
    actions: [
      { id: "managed_users", label: "Managed Users" },
      { id: "managed_branches", label: "Managed Branches" },
      { id: "managed_services", label: "Managed Services" },
    ]
  }
]

const normalizeAction = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const mapToCanonicalAction = (actionType: string, metadata?: Record<string, unknown> | null): CanonicalAction | null => {
  const normalized = normalizeAction(actionType)

  if (normalized === "changed_inventory") {
    const op = metadata?.operation
    if (op === "in") return "inventory_restock"
    if (op === "out") return "inventory_usage"
    if (op === "adjustment") return "inventory_adjustment"
    if (op === "transfer") return "inventory_transfer"
    if (op === "create") return "inventory_product_create"
    if (op === "update") return "inventory_product_update"
    if (op === "delete") return "inventory_product_delete"
    return "changed_inventory"
  }

  if (normalized === "added_new_product") return "inventory_product_create"
  if (normalized === "restocked_inventory") return "inventory_restock"
  if (normalized === "adjusted_stock") return "inventory_adjustment"
  if (normalized === "completed_sale") return "completed_sale"
  if (normalized === "refunded_sale") return "refunded_sale"

  for (const key of ACTION_KEYS) {
    if (key === normalized) return key
    const aliases = ACTION_ALIASES[key]
    if (aliases && aliases.some((alias) => normalizeAction(alias) === normalized)) {
      return key
    }
  }

  return null
}

export default function UserLogsPage() {
  const [logs, setLogs] = useState<UserLogRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | "all">("all")
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
        supabase.from("user_profiles").select("id, role, branch_id, full_name, email"),
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

  const fetchLogs = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [{ data: logData, error: logError }, { data: invData, error: invError }, { data: txData, error: txError }, { data: profiles }] = await Promise.all([
        supabase
          .from("user_logs")
          .select("id, user_id, user_email, user_name, action_type, entity_type, entity_id, entity_name, branch_id, changes, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("inventory_transactions")
          .select("*, product:inventory_products(name)")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("transactions")
          .select("id, receipt_number, branch_id, total_due, discount_amount, payment_method, status, created_by, created_at, customer_id, customer:customers(name)")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("user_profiles")
          .select("id, full_name, email")
      ])

      if (logError && !logData && !invData && !txData) {
        throw logError
      }

      // Map profiles for fast lookup
      const pMap: Record<string, any> = {}
      for (const p of profiles || []) pMap[p.id] = p;

      const baseLogs = (logData || []) as UserLogRow[];

      const invLogs: UserLogRow[] = (invData || []).map(t => {
         const profile = t.performed_by ? pMap[t.performed_by] : null;
         const opMap: Record<string, string> = {
            'in': 'inventory_restock',
            'out': 'inventory_usage',
            'adjustment': 'inventory_adjustment',
            'transfer': 'inventory_transfer'
         }

         return {
            id: t.id,
            user_id: t.performed_by || "system_user",
            user_name: profile?.full_name || "System",
            user_email: profile?.email || null,
            action_type: opMap[t.type] || "inventory_adjustment",
            entity_type: "inventory",
            entity_id: t.product_id,
            entity_name: (t.reason || "").includes("Voided") ? `[RESTOCKED VIA REFUND] ${t.product?.name || "Product"}` : t.product?.name || "Product",
            branch_id: t.branch_id,
            changes: {
               before: { quantity: t.previous_quantity },
               after: { quantity: t.new_quantity }
            },
            metadata: {
               operation: t.type,
               reason: t.reason,
               delta: t.quantity
            },
            created_at: t.created_at
         }
      })

      const posLogs: UserLogRow[] = [];
      for (const t of txData || []) {
         const profile = t.created_by ? pMap[t.created_by] : null;

         const baseLog: UserLogRow = {
            id: t.id,
            user_id: t.created_by || "system_user",
            user_name: profile?.full_name || "System",
            user_email: profile?.email || null,
            action_type: "processed_transaction",
            entity_type: "transaction",
            entity_id: t.id,
            entity_name: t.status === "voided" ? `[REFUNDED & VOIDED] Receipt #${t.receipt_number}` : `Receipt #${t.receipt_number}`,
            branch_id: t.branch_id,
            changes: {
               before: null,
               after: { 
                 total_due: t.total_due, 
                 discount_amount: t.discount_amount,
                 payment_method: t.payment_method 
               }
            },
            metadata: {
               receipt_number: t.receipt_number,
               customer: t.customer?.name || "Walk-in"
            },
            created_at: t.created_at
         };

         posLogs.push(baseLog);

         if (Number(t.discount_amount) > 0) {
             posLogs.push({
                 ...baseLog,
                 id: `${t.id}-discount`,
                 action_type: "applied_discounts",
                 changes: {
                    before: { discount_amount: 0 },
                    after: { discount_amount: t.discount_amount }
                 }
             });
         }
      }

      const combined = [...baseLogs, ...invLogs, ...posLogs].sort((a, b) => {
         return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })

      setLogs(combined)
    } catch (err) {
      console.error("Error loading combined user logs:", err)
      setLogs([])
      setErrorMessage("No user log records are available yet.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeAction, searchQuery, dateFrom, dateTo])

  const getActionLabel = (action: string, metadata?: Record<string, unknown> | null) => {
    const canonical = mapToCanonicalAction(action, metadata)
    if (canonical) {
      return ACTION_LABELS[canonical]
    }

    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char: string) => char.toUpperCase())
  }

  const getActionWithOp = (log: UserLogRow) => {
    const canonical = mapToCanonicalAction(log.action_type, log.metadata)
    if (canonical && ACTION_LABELS[canonical]) {
      return ACTION_LABELS[canonical]
    }
    
    // Fallback logic
    const base = getActionLabel(log.action_type, log.metadata)
    const op = log.metadata?.operation as string | undefined
    if (!op) return base
    let human = op
    if (op === "create") human = "added"
    else if (op === "update") human = "modified"
    else if (op === "delete") human = "deleted"
    else if (op === "in") human = "restocked"
    else if (op === "out") human = "usage / out"
    else if (op === "adjustment") human = "adjusted"
    return `${base} (${human})`
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
      const canonicalAction = mapToCanonicalAction(log.action_type, log.metadata)
      
      // Category check
      if (activeCategory !== "all") {
        const categoryDef = CATEGORY_DEFINITIONS.find(c => c.id === activeCategory)
        if (!categoryDef) return false
        
        const actionMatchesCategory = categoryDef.actions.some(a => a.id === canonicalAction)
        if (!actionMatchesCategory) return false
      }

      // Exact action check
      if (activeAction !== "all") {
         if (canonicalAction !== activeAction) return false
      }

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
      const what = `${getActionLabel(log.action_type, log.metadata)} ${log.entity_type || ""} ${log.entity_name || ""}`.toLowerCase()
      const branchName = log.branch_id ? (branchMap[log.branch_id] || "").toLowerCase() : ""

      return who.includes(term) || what.includes(term) || branchName.includes(term)
    })
  }, [logs, activeAction, searchQuery, dateFrom, dateTo, branchMap])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const getRoleBadge = (log: UserLogRow) => {
    const snapshot = (log.metadata as any)?.userSnapshot
    const role = snapshot?.role || userProfileMap[log.user_id]?.role

    if (!role) return null
    if (role === "super_admin")
      return <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-400 text-purple-600">Super Admin</Badge>
    if (role === "branch_admin")
      return <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-400 text-blue-600">Branch Admin</Badge>
    return <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">Staff</Badge>
  }

  const getDisplayName = (log: UserLogRow) => {
    const snapshot = (log.metadata as any)?.userSnapshot

    if (log.user_name) return log.user_name
    if (snapshot?.name) return snapshot.name
    if (log.user_email) return log.user_email
    if (snapshot?.email) return snapshot.email

    const profile = userProfileMap[log.user_id]
    if (profile) {
      if (profile.full_name) return profile.full_name
      if (profile.email) return profile.email
      return `${profile.role.replace(/_/g, " ")} (${log.user_id.slice(0, 8)})`
    }

    return "Unknown User"
  }

  const getBranchName = (log: UserLogRow) => {
    const snapshot = (log.metadata as any)?.userSnapshot
    const branchId = log.branch_id || snapshot?.branch_id || userProfileMap[log.user_id]?.branch_id || null
    if (!branchId) return null
    return branchMap[branchId] || null
  }

  const getDetailsText = (log: UserLogRow) => {
    const details: string[] = []

    if (log.entity_type) {
      details.push(log.entity_type.replace(/_/g, " "))
    }

    if (log.entity_name) {
      details.push(log.entity_name)
    }

    // Include reason if present in metadata
    if (log.metadata?.reason) {
      details.push(`Reason: ${log.metadata.reason}`)
    }

    if (log.entity_id && !log.entity_name) {
      details.push(`ID: ${log.entity_id}`)
    }

    if (!details.length) {
      return "-"
    }

    return details.join(" • ")
  }

  const renderReadableValue = (val: any): string => {
    if (val === null || val === undefined || val === "") return "-"
    if (typeof val === "boolean") return val ? "Yes" : "No"
    if (typeof val === "object") {
       if (Array.isArray(val)) return `[${val.length} items]`
       return "{...}"
    }
    return String(val)
  }

  const renderChanges = (changes: any) => {
    if (!changes) return null;
    
    const before = changes.before;
    const after = changes.after;

    if (before && after && typeof before === "object" && typeof after === "object") {
       const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
       const differences = keys.filter(k => before[k] !== after[k]);

       if (differences.length === 0) return <div className="text-sm text-muted-foreground italic">No values modified.</div>;

       return (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {differences.map(key => {
               const bVal = before[key];
               const aVal = after[key];
               return (
                 <div key={key} className="p-3 bg-muted/30 rounded-lg border border-muted/50 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{key.replace(/_/g, " ")}</p>
                    <div className="flex flex-col gap-1.5">
                       {bVal !== undefined && (
                         <div className="flex items-start gap-2">
                           <span className="text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded mt-0.5">Old</span>
                           <span className="text-sm line-through text-muted-foreground break-all">{renderReadableValue(bVal)}</span>
                         </div>
                       )}
                       {aVal !== undefined && (
                         <div className="flex items-start gap-2">
                           <span className="text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded mt-0.5">New</span>
                           <span className="text-sm font-medium break-all">{renderReadableValue(aVal)}</span>
                         </div>
                       )}
                    </div>
                 </div>
               )
            })}
         </div>
       )
    }

    if (before && !after) {
       return (
         <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
           <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Deleted Original Data:</p>
           <div className="flex flex-wrap gap-2">
             {Object.keys(before).filter(k => typeof before[k] !== "object").map(key => (
                <div key={key} className="text-xs bg-background md:bg-background/50 dark:bg-black/20 px-2 py-1.5 rounded border border-red-50 dark:border-red-900/20">
                  <span className="text-muted-foreground mr-1 capitalize">{key.replace(/_/g, " ")}:</span>
                  <span className="font-medium">{renderReadableValue(before[key])}</span>
                </div>
             ))}
           </div>
         </div>
       )
    }

    if (after && !before) {
       return (
         <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg">
           <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Newly Initialized Data:</p>
           <div className="flex flex-wrap gap-2">
             {Object.keys(after).filter(k => typeof after[k] !== "object").map(key => (
                <div key={key} className="text-xs bg-background md:bg-background/50 dark:bg-black/20 px-2 py-1.5 rounded border border-green-50 dark:border-green-900/20">
                  <span className="text-muted-foreground mr-1 capitalize">{key.replace(/_/g, " ")}:</span>
                  <span className="font-medium">{renderReadableValue(after[key])}</span>
                </div>
             ))}
           </div>
         </div>
       )
    }

    return (
       <div className="flex flex-wrap gap-2">
         {Object.keys(changes).map(key => (
            <div key={key} className="text-xs bg-muted/40 px-2.5 py-1.5 rounded border border-muted/50">
               <span className="text-muted-foreground mr-1 capitalize">{key.replace(/_/g, " ")}:</span>
               <span className="font-medium">{renderReadableValue(changes[key])}</span>
            </div>
         ))}
       </div>
    )
  }

  const renderMetadata = (metadata: any) => {
     if (!metadata) return null;
     const items = Object.keys(metadata).filter(k => k !== "userSnapshot" && metadata[k] != null && metadata[k] !== "");
     if (items.length === 0) return null;

     return (
       <div className="flex flex-wrap gap-2">
         {items.map(key => {
            const val = metadata[key];
            if (typeof val === "object") return null;
            return (
              <div key={key} className="text-xs bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 px-2.5 py-1.5 rounded border border-blue-100 dark:border-blue-900/30">
                 <span className="opacity-70 mr-1 capitalize">{key.replace(/_/g, " ")}:</span>
                 <span className="font-semibold">{String(val)}</span>
              </div>
            )
         })}
       </div>
     )
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
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Activity Filters
          </CardTitle>
          <Button onClick={fetchLogs} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 pt-2">
             <Button
               variant={activeCategory === "all" ? "default" : "outline"}
               onClick={() => { setActiveCategory("all"); setActiveAction("all"); }}
               className="h-9 px-4 rounded-md font-medium"
             >
                <LayoutGrid className="h-4 w-4 mr-2" />
                All Activities
             </Button>
             
             {CATEGORY_DEFINITIONS.map(cat => {
                const Icon = CATEGORY_ICONS[cat.id];
                return (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    onClick={() => { setActiveCategory(cat.id); setActiveAction("all"); }}
                    className="h-9 px-4 rounded-md font-medium"
                  >
                     <Icon className="h-4 w-4 mr-2" />
                     {cat.id}
                  </Button>
                );
             })}
          </div>

          {activeCategory !== "all" && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border border-muted/50 animate-in fade-in slide-in-from-top-2">
               <span className="text-sm font-medium text-muted-foreground self-center mr-2">Filter exactly:</span>
               <Button 
                 variant={activeAction === "all" ? "default" : "outline"} 
                 size="sm" 
                 onClick={() => setActiveAction("all")}
                 className="rounded-full"
               >
                 All {activeCategory}
               </Button>
               {CATEGORY_DEFINITIONS.find(c => c.id === activeCategory)?.actions.map(action => (
                 <Button 
                   key={action.id}
                   variant={activeAction === action.id ? "default" : "outline"}
                   size="sm"
                   onClick={() => setActiveAction(action.id as any)}
                   className="rounded-full"
                 >
                   {action.label}
                 </Button>
               ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-5 pt-2">
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">From</label>
                <DatePicker
                  value={dateFrom ? new Date(dateFrom) : undefined}
                  onChange={(d) => setDateFrom(d ? d.toISOString().slice(0,10) : "")}
                  className="h-9 w-52 max-w-full text-sm truncate"
                  placeholder="Start date"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">To</label>
                <DatePicker
                  value={dateTo ? new Date(dateTo) : undefined}
                  onChange={(d) => setDateTo(d ? d.toISOString().slice(0,10) : "")}
                  className="h-9 w-52 max-w-full text-sm truncate"
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
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">#</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Who / Branch</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Action</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">When</th>
                    <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log, index) => (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`border-b last:border-b-0 hover:bg-muted/20 ${
                          expandedLogId === log.id ? "bg-muted/30" : ""
                        }`}
                        onClick={() => setExpandedLogId((prev) => (prev === log.id ? null : log.id))}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="p-3 align-top text-xs text-muted-foreground">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex items-start gap-2">
                            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-medium">{getDisplayName(log)}</p>
                                {getRoleBadge(log)}
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
                        <td className="p-3 text-sm font-medium">{getActionWithOp(log)}</td>
                        <td className="p-3 align-middle">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateTime(log.created_at)}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{getDetailsText(log)}</td>
                      </tr>
                      {expandedLogId === log.id && (
                        <tr className="bg-muted/10">
                          <td colSpan={5} className="p-3">
                            <div className="space-y-3">
                              {log.changes && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground mb-2 mt-1">
                                    CHANGES
                                  </div>
                                  {renderChanges(log.changes)}
                                </div>
                              )}
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="pt-2">
                                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                                    METADATA
                                  </div>
                                  {renderMetadata(log.metadata)}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
