import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, CreditCard, TrendingUp, Activity, LayoutDashboard, GripVertical, Check, Calendar, Package, ClipboardList, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCounter } from "@/hooks/use-counter"
import { useAuth } from "@/contexts/auth-context"
import { computeChart } from "@/lib/dashboard-utils"

export type TimeFilter = "daily" | "weekly" | "yearly"
export interface RawRow { visits: number; last_visit: string | null; created_at: string | null; nfc_uid: string | null }
export interface ChartPoint { label: string; count: number }

// Lazy load heavy chart components
const DashboardCharts = lazy(() => import("@/components/features/dashboard/dashboard-charts"))
const DashboardModalCharts = lazy(() => import("@/components/features/dashboard/dashboard-modal-charts"))

// ---------------------------------------------------------------------------
// Drag-and-drop types & helpers
// ---------------------------------------------------------------------------
type SectionId = "stats" | "charts" | "quick-actions"
const DEFAULT_ORDER: SectionId[] = ["stats", "charts", "quick-actions"]
const STORAGE_KEY = "dashboard-section-order"

function loadOrder(): SectionId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ORDER
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((x) => DEFAULT_ORDER.includes(x as SectionId))) {
      return parsed as SectionId[]
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

// Loading skeleton for charts
function ChartLoader({ height = 200 }: { height?: number }) {
  return (
    <div style={{ height }} className="w-full flex items-center justify-center bg-muted/5 rounded-lg border border-dashed border-border/50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Loading Chart...</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DraggableSection wrapper
// ---------------------------------------------------------------------------
interface DraggableSectionProps {
  id: SectionId
  editMode: boolean
  dragOver: boolean
  onDragStart: (id: SectionId) => void
  onDragOver: (e: React.DragEvent, id: SectionId) => void
  onDragEnd: () => void
  onDrop: (id: SectionId) => void
  children: React.ReactNode
}

function DraggableSection({ id, editMode, dragOver, onDragStart, onDragOver, onDragEnd, onDrop, children }: DraggableSectionProps) {
  return (
    <div
      draggable={editMode}
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDragEnd={onDragEnd}
      onDrop={() => onDrop(id)}
      className={[
        "relative transition-all duration-200",
        editMode ? "cursor-grab active:cursor-grabbing" : "",
        dragOver && editMode ? "scale-[1.01] ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : "",
      ].join(" ")}
    >
      {editMode && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-6 rounded-md bg-background border border-border shadow-sm text-muted-foreground select-none">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className={editMode ? "pl-6" : ""}>{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { user, userProfile } = useAuth()

  const [stats, setStats] = useState({ totalCustomers: 0, activeCards: 0, totalVisits: 0, recentActivity: 0 })
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [activityFilter, setActivityFilter] = useState<TimeFilter>("daily")
  const [registrationsFilter, setRegistrationsFilter] = useState<TimeFilter>("weekly")
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState<"customers" | "cards" | "visits" | "activity" | null>(null)

  // ── Edit / drag state ───────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [sections, setSections] = useState<SectionId[]>(loadOrder)
  const dragItem = useRef<SectionId | null>(null)
  const [dragOverId, setDragOverId] = useState<SectionId | null>(null)

  const handleDragStart = useCallback((id: SectionId) => { dragItem.current = id }, [])
  const handleDragOver = useCallback((e: React.DragEvent, id: SectionId) => {
    e.preventDefault()
    setDragOverId(id)
  }, [])
  const handleDragEnd = useCallback(() => { dragItem.current = null; setDragOverId(null) }, [])
  const handleDrop = useCallback((targetId: SectionId) => {
    const from = dragItem.current
    if (!from || from === targetId) { dragItem.current = null; setDragOverId(null); return }
    setSections((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(from)
      const toIdx = next.indexOf(targetId)
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, from)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    dragItem.current = null
    setDragOverId(null)
  }, [])

  const dailyActivity = useMemo(() => computeChart(rawRows, activityFilter, "last_visit"), [rawRows, activityFilter])
  const monthlyGrowth = useMemo(() => computeChart(rawRows, registrationsFilter, "created_at"), [rawRows, registrationsFilter])

  const totalCustomersCount = useCounter(stats.totalCustomers, 1200)
  const activeCardsCount = useCounter(stats.activeCards, 1200)
  const totalVisitsCount = useCounter(stats.totalVisits, 1200)
  const recentActivityCount = useCounter(stats.recentActivity, 1200)

  useEffect(() => {
    document.title = "Dashboard - FG Aesthetic Centre"
    loadAll()
  }, [])

  // When a modal with charts opens we need to trigger a resize event
  // so Recharts can recalculate dimensions. The modal is initially
  // hidden which can cause the animation/render to misbehave.
  useEffect(() => {
    if (openModal) {
      // dispatch after paint so charts can measure themselves
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50)
    }
  }, [openModal])

  const loadAll = async () => {
    try {
      const { data: customers, error } = await supabase
        .from("customers")
        .select("visits,last_visit,created_at,nfc_uid")

      if (error) throw error

      const rows: RawRow[] = customers ?? []
      const totalCustomers = rows.length
      const activeCards = rows.filter((row) => row.nfc_uid !== null).length
      const totalVisits = rows.reduce((sum, row) => sum + (row.visits || 0), 0)

      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoIso = sevenDaysAgo.toISOString()
      const recentActivity = rows.filter((row) => row.last_visit && row.last_visit >= sevenDaysAgoIso).length

      setStats({ totalCustomers, activeCards, totalVisits, recentActivity })
      setRawRows(rows)

    } catch (err) {
      console.error("Dashboard load error:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── Stat cards config ────────────────────────────────────────────────────
  const statCards = useMemo(() => [
    { title: "Total Customers", value: loading ? "—" : totalCustomersCount.toLocaleString(), sub: "Registered", icon: Users, id: "customers" as const },
    { title: "Active NFC Cards", value: loading ? "—" : activeCardsCount.toLocaleString(), sub: "Linked cards", icon: CreditCard, id: "cards" as const },
    { title: "Total Visits", value: loading ? "—" : totalVisitsCount.toLocaleString(), sub: "All-time", icon: TrendingUp, id: "visits" as const },
    { title: "Recent Activity", value: loading ? "—" : recentActivityCount.toLocaleString(), sub: "Last 7 days", icon: Activity, id: "activity" as const },
  ], [loading, totalCustomersCount, activeCardsCount, totalVisitsCount, recentActivityCount])

  // ── Section renderers ────────────────────────────────────────────────────
  const sectionMap: Record<SectionId, React.ReactNode> = useMemo(() => ({
    stats: (
      /* ── Stat Cards ─────────────────────────────────────────────────── */
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ title, value, sub, icon: Icon, id }) => (
          <Card 
            key={title} 
            className="border border-border shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-95"
            onClick={() => setOpenModal(id)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground leading-none mb-2">{title}</p>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    ),

    charts: (
      <Suspense fallback={<ChartLoader />}>
        <DashboardCharts
          dailyActivity={dailyActivity}
          monthlyGrowth={monthlyGrowth}
          activityFilter={activityFilter}
          registrationsFilter={registrationsFilter}
          onActivityFilterChange={setActivityFilter}
          onRegistrationsFilterChange={setRegistrationsFilter}
        />
      </Suspense>
    ),

    "quick-actions": (
      /* ── Quick Actions ───────────────────────────────────────────────── */
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          <p className="text-xs text-muted-foreground">Jump to common tasks</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pb-4 px-5">
          {(() => {
            const isPrivileged = userProfile?.role === "super_admin" || userProfile?.role === "branch_admin"
            const actions = [
              { href: "/dashboard/scan", icon: CreditCard, label: "Check-in Member", desc: "Lookup and auto-apply points" },
              { href: "/dashboard/scan", icon: UserPlus, label: "New Registration", desc: "Link a new card to a member", state: { mode: "register" } },
              { href: "/dashboard/customers", icon: Users, label: "Member Directory", desc: "Manage clinic profiles" },
              { href: "/dashboard/appointments", icon: Calendar, label: "Appointments", desc: "View and book sessions" },
            ]
            
            if (isPrivileged) {
              actions.push({ href: "/dashboard/inventory", icon: Package, label: "Inventory", desc: "Manage stock and items" })
              actions.push({ href: "/dashboard/reports", icon: ClipboardList, label: "Reports", desc: "View clinic analytics" })
            }
            
            return actions.map(({ href, icon: Icon, label, desc, state }) => (
              <Link
                key={label}
                to={href}
                state={state}
                className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{desc}</p>
                </div>
              </Link>
            ))
          })()}
        </CardContent>
      </Card>
    ),
  }), [statCards, activityFilter, registrationsFilter, dailyActivity, monthlyGrowth, userProfile])

  return (
    <div className="space-y-6 pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {userProfile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Admin"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">FG Aesthetic Centre</p>
            <p className="text-xs font-medium text-primary">{userProfile?.branch_name || "NFC Loyalty Dashboard"}</p>
          </div>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={[
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
              editMode
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30",
            ].join(" ")}
          >
            {editMode ? (
              <><Check className="h-3.5 w-3.5" />Done</>
            ) : (
              <><LayoutDashboard className="h-3.5 w-3.5" />Edit Dashboard</>
            )}
          </button>
        </div>
      </div>

      {/* ── Edit mode hint ───────────────────────────────────────────────── */}
      {editMode && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs text-primary">
          <GripVertical className="h-3.5 w-3.5 shrink-0" />
          Drag the sections to rearrange your dashboard. Your layout is saved automatically.
        </div>
      )}

      {/* ── Draggable sections ───────────────────────────────────────────── */}
      {sections.map((id) => (
        <DraggableSection
          key={id}
          id={id}
          editMode={editMode}
          dragOver={dragOverId === id}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
        >
          {sectionMap[id]}
        </DraggableSection>
      ))}

      {/* ── Modal: Customers Chart ─────────────────────────────────────── */}
      <Dialog open={openModal === "customers"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Total Customers</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<ChartLoader height={300} />}>
            <DashboardModalCharts
              type="customers"
              data={monthlyGrowth}
              filter={registrationsFilter}
              onFilterChange={setRegistrationsFilter}
              stats={stats}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Active NFC Cards ────────────────────────────────────── */}
      <Dialog open={openModal === "cards"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Active NFC Cards</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<ChartLoader height={250} />}>
            <DashboardModalCharts
              type="cards"
              data={monthlyGrowth}
              filter={registrationsFilter} // Not used for cards but required by type
              onFilterChange={setRegistrationsFilter}
              stats={stats}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Total Visits ────────────────────────────────────────── */}
      <Dialog open={openModal === "visits"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Total Visits</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<ChartLoader height={250} />}>
            <DashboardModalCharts
              type="visits"
              data={dailyActivity}
              filter={activityFilter}
              onFilterChange={setActivityFilter}
              stats={stats}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Recent Activity ──────────────────────────────────────── */}
      <Dialog open={openModal === "activity"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Recent Activity</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<ChartLoader height={250} />}>
            <DashboardModalCharts
              type="activity"
              data={dailyActivity}
              filter={activityFilter}
              onFilterChange={setActivityFilter}
              stats={stats}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

    </div>
  )
}
