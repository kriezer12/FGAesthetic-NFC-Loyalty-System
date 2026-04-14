import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, CreditCard, TrendingUp, Activity, LayoutDashboard, GripVertical, Check, Calendar, Package, ClipboardList, UserPlus, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
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
type SectionId = "stats" | "charts" | "quick-actions" | "pending-bookings"
const DEFAULT_ORDER: SectionId[] = ["quick-actions", "pending-bookings", "stats", "charts"]
const STORAGE_KEY = "dashboard-section-order"

function loadOrder(): SectionId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ORDER
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      // Ensure pending-bookings is injected if missing from old saved state
      const valid = parsed.filter(x => DEFAULT_ORDER.includes(x as SectionId)) as SectionId[]
      if (!valid.includes("pending-bookings")) valid.splice(1, 0, "pending-bookings")
      if (valid.length > 0) return valid
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
// Stat Card configs — flat light gold icon bg
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { user, userProfile } = useAuth()

  const [stats, setStats] = useState({ totalCustomers: 0, activeCards: 0, totalVisits: 0, recentActivity: 0 })
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [pendingBookings, setPendingBookings] = useState<any[]>([])
  const [showAllPending, setShowAllPending] = useState(false)
  const [selectedPendingBooking, setSelectedPendingBooking] = useState<any | null>(null)
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

  useEffect(() => {
    if (openModal) {
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

      const { data: upcomingApts } = await supabase
        .from("appointments")
        .select("id, title, customer_name, start_time, end_time, status, notes, staff_name")
        .eq("status", "pending")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(50)
      
      setPendingBookings(upcomingApts || [])

    } catch (err) {
      console.error("Dashboard load error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase.from("appointments").update({ status: "scheduled" }).eq("id", id)
      if (error) throw error
      setPendingBookings(prev => prev.filter(p => p.id !== id))
      toast.success("Appointment approved and scheduled")
    } catch (err: any) {
      toast.error(err.message || "Failed to approve appointment")
    }
  }

  const handleDecline = async (id: string) => {
    try {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id)
      if (error) throw error
      setPendingBookings(prev => prev.filter(p => p.id !== id))
      toast.success("Appointment declined")
    } catch (err: any) {
      toast.error(err.message || "Failed to decline appointment")
    }
  }

  // ── Stat cards config ────────────────────────────────────────────────────
  const statCards = useMemo(() => [
    { title: "Total Customers", value: loading ? "—" : totalCustomersCount.toLocaleString(), sub: "Registered members", icon: Users, id: "customers" as const },
    { title: "Active NFC Cards", value: loading ? "—" : activeCardsCount.toLocaleString(), sub: "Linked cards", icon: CreditCard, id: "cards" as const },
    { title: "Total Visits", value: loading ? "—" : totalVisitsCount.toLocaleString(), sub: "All-time check-ins", icon: TrendingUp, id: "visits" as const },
    { title: "Recent Activity", value: loading ? "—" : recentActivityCount.toLocaleString(), sub: "Last 7 days", icon: Activity, id: "activity" as const },
  ], [loading, totalCustomersCount, activeCardsCount, totalVisitsCount, recentActivityCount])

  // ── Quick actions config — flat light gold icons ──────────────────────────
  const quickActionIconBg = "bg-primary/10 border border-primary/20 text-primary"

  // ── Section renderers ────────────────────────────────────────────────────
  const sectionMap: Record<SectionId, React.ReactNode> = useMemo(() => ({
    stats: (
      /* ── Stat Cards ─────────────────────────────────────────────────── */
      <div className="space-y-3">
        <h2 className="sr-only">Statistical Overview</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ title, value, sub, icon: Icon, id }) => (
          <div
            key={title}
            onClick={() => setOpenModal(id)}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-6 border border-primary/20 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer active:scale-[0.98]"
          >
            <div className="absolute -right-6 -top-6 rounded-full bg-primary/10 p-12 transition-transform duration-500 group-hover:scale-125"></div>
            <div className="relative z-10 flex flex-row items-center justify-between mb-4">
              <span className="text-sm font-semibold tracking-tight text-foreground/70 dark:text-foreground/70">{title}</span>
              <div className="rounded-full bg-primary/20 dark:bg-primary/20 p-2 text-primary dark:text-primary shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="relative z-10 text-3xl font-bold text-foreground">
              {value}
            </div>
            <p className="relative z-10 text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
        ))}
        </div>
      </div>
    ),



    charts: (
      <div className="space-y-3">
        <h2 className="sr-only">Performance Charts</h2>
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
      </div>
    ),


    "pending-bookings": (
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle as="h2" className="text-lg font-bold">Pending Online Bookings</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Upcoming scheduled appointments that need review</p>
        </CardHeader>
        <CardContent className="pb-2 px-5 pt-4 space-y-2">
          {pendingBookings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
              No pending bookings at the moment.
            </div>
          ) : (
            <>
              {(showAllPending ? pendingBookings : pendingBookings.slice(0, 3)).map((appt) => (
                <div key={appt.id} className="flex flex-col bg-muted/20 p-3 rounded-lg border gap-1 transition-colors hover:bg-muted/40 cursor-pointer" onClick={() => setSelectedPendingBooking(appt)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{appt.title}</p>
                      <p className="text-xs text-muted-foreground">{appt.customer_name || "Unknown Customer"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{new Date(appt.start_time).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  {appt.notes && appt.notes.replace("[Online Booking]", "").trim() && (
                    <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded mt-1 line-clamp-1">
                      <span className="font-medium text-foreground/80">Notes:</span> {appt.notes.replace("[Online Booking]", "").replace("Notes from customer:", "").trim()}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); handleApprove(appt.id); }} className="flex flex-1 justify-center items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors pointer-cursor relative z-10 transition-colors" style={{ cursor: "pointer" }}>
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDecline(appt.id); }} className="flex flex-1 justify-center items-center gap-1 text-xs px-3 py-1.5 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 border border-destructive/20 transition-colors pointer-cursor relative z-10 transition-colors" style={{ cursor: "pointer" }}>
                      <X className="h-3 w-3" /> Decline
                    </button>
                  </div>
                </div>
              ))}
              {pendingBookings.length > 3 && (
                <button
                  onClick={() => setShowAllPending(!showAllPending)}
                  className="w-full py-2 mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-border/50 rounded-lg bg-background/50 hover:bg-background"
                >
                  {showAllPending ? "Show Less" : `Show More (${pendingBookings.length - 3} more)`}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    ),

    "quick-actions": (
      /* ── Quick Actions ───────────────────────────────────────────────── */
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle as="h2" className="text-lg font-bold">Quick Actions</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Jump to common tasks</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pb-2 px-5">
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
                  className="group flex items-start gap-3 rounded-xl border border-border p-3 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                >
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${quickActionIconBg} transition-transform group-hover:scale-110`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{desc}</p>
                  </div>
                </Link>
              ))
          })()}
        </CardContent>
      </Card>
    ),
  }), [statCards, activityFilter, registrationsFilter, dailyActivity, monthlyGrowth, userProfile, pendingBookings, showAllPending])

  const displayName = userProfile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Admin"

  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-background border border-border shadow-sm">
        <style>{`
          @keyframes floatA {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            33%       { transform: translate(6px, -8px) scale(1.06); }
            66%       { transform: translate(-4px, 6px) scale(0.96); }
          }
          @keyframes floatB {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            40%       { transform: translate(-8px, 6px) scale(1.08); }
            70%       { transform: translate(5px, -5px) scale(0.94); }
          }
          @keyframes floatC {
            0%, 100% { transform: translate(0px, 0px); }
            50%       { transform: translate(4px, -6px); }
          }
          @keyframes shimmerSweep {
            0%   { transform: translateX(-100%); opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 1; }
            100% { transform: translateX(100%); opacity: 0; }
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 0.35; }
            50%       { opacity: 0.7; }
          }
          .hdr-float-a { animation: floatA 7s ease-in-out infinite; }
          .hdr-float-b { animation: floatB 9s ease-in-out infinite; animation-delay: -3s; }
          .hdr-float-c { animation: floatC 5s ease-in-out infinite; animation-delay: -1.5s; }
          .hdr-shimmer { animation: shimmerSweep 4s ease-in-out infinite; animation-delay: 1s; }
          .hdr-dot     { animation: dotPulse 3s ease-in-out infinite; }
        `}</style>

        {/* Animated shimmer — top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden rounded-t-2xl bg-primary/20">
          <div className="hdr-shimmer absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        {/* Floating blob A — large, top-right */}
        <div className="hdr-float-a pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/50 blur-2xl" />
        {/* Floating blob B — medium, bottom-left */}
        <div className="hdr-float-b pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-primary/10 blur-xl" />
        {/* Floating blob C — small accent, top-left */}
        <div className="hdr-float-c pointer-events-none absolute left-1/3 -top-6 h-16 w-16 rounded-full bg-secondary/40/40 blur-lg" />

        {/* Animated dot grid — bottom right */}
        <div className="pointer-events-none absolute bottom-3 right-4 grid grid-cols-4 gap-[4px]">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="hdr-dot h-[3px] w-[3px] rounded-full bg-primary/50"
              style={{ animationDelay: `${(i * 0.15) % 3}s` }}
            />
          ))}
        </div>

        <div className="relative p-5">
          {/* Top row: greeting + button */}
          <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{greeting()},</p>
                <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">{displayName}</h1>
              </div>
            <button
              onClick={() => setEditMode((v) => !v)}
              className={[
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all shrink-0",
                editMode
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30",
              ].join(" ")}
            >
              {editMode ? (
                <><Check className="h-3.5 w-3.5" />Done</>
              ) : (
                <><LayoutDashboard className="h-3.5 w-3.5" />Edit Layout</>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-border/60" />

          {/* Bottom info row */}
          <div className="flex flex-wrap items-center gap-2">
            {userProfile?.branch_name && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                📍 {userProfile.branch_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary/80 capitalize">
              {userProfile?.role?.replace("_", " ") ?? "Staff"}
            </span>
            <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
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
              filter={registrationsFilter}
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

      {/* ── Modal: Pending Booking Details ──────────────────────────────────────── */}
      <Dialog open={!!selectedPendingBooking} onOpenChange={(open) => !open && setSelectedPendingBooking(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedPendingBooking && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p className="text-base">{selectedPendingBooking.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="text-base">{selectedPendingBooking.customer_name || "Unknown Customer"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Staff Assigned</p>
                  <p className="text-base">{selectedPendingBooking.staff_name || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-base">{new Date(selectedPendingBooking.start_time).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time</p>
                  <p className="text-base">
                    {new Date(selectedPendingBooking.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {selectedPendingBooking.end_time 
                      ? new Date(selectedPendingBooking.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) 
                      : "TBD"}
                  </p>
                </div>
              </div>
              {selectedPendingBooking.notes && selectedPendingBooking.notes.replace("[Online Booking]", "").trim() && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <div className="text-sm bg-muted/30 p-3 rounded-md mt-1 whitespace-pre-wrap">
                    {selectedPendingBooking.notes.replace("[Online Booking]", "").replace("Notes from customer:", "").trim()}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t mt-4">
                <button
                  onClick={() => {
                    handleApprove(selectedPendingBooking.id)
                    setSelectedPendingBooking(null)
                  }}
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button
                  onClick={() => {
                    handleDecline(selectedPendingBooking.id)
                    setSelectedPendingBooking(null)
                  }}
                  className="flex-1 py-2 px-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <X className="h-4 w-4" /> Decline
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


