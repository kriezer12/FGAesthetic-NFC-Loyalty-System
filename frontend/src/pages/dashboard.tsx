import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, CreditCard, TrendingUp, Activity, LayoutDashboard, GripVertical, Check, Calendar, Package, ClipboardList, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCounter } from "@/hooks/use-counter"
import { useAuth } from "@/contexts/auth-context"
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

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
// Types
// ---------------------------------------------------------------------------
type TimeFilter = "daily" | "weekly" | "yearly"
interface ChartPoint { label: string; count: number }
interface RawRow { visits: number; last_visit: string | null; created_at: string | null; nfc_uid: string | null }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const GOLD = "var(--color-primary)"

// ---------------------------------------------------------------------------
// Chart data computation
// ---------------------------------------------------------------------------
function generateTimeBuckets(filter: TimeFilter): { label: string; start: number; end: number; count: number }[] {
  const buckets: { label: string; start: number; end: number; count: number }[] = []
  const now = new Date()
  
  if (filter === "daily") {
    // 7 days ending today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const start = d.getTime()
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()
      buckets.push({ label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }), start, end, count: 0 })
    }
  } else if (filter === "weekly") {
    // 8 weeks ending today
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7), 23, 59, 59, 999)
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6, 0, 0, 0, 0)
      buckets.push({ label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), start: start.getTime(), end: end.getTime(), count: 0 })
    }
  } else if (filter === "yearly") {
    // 12 months ending this month
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      buckets.push({ label: start.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), start: start.getTime(), end: end.getTime(), count: 0 })
    }
  }
  return buckets
}

function computeChart(rows: RawRow[], filter: TimeFilter, dateKey: "last_visit" | "created_at"): ChartPoint[] {
  const buckets = generateTimeBuckets(filter)
  
  for (const row of rows) {
    const val = row[dateKey]
    if (!val) continue
    
    // Parse the date robustly
    const time = new Date(val).getTime()
    if (isNaN(time)) continue
    
    // Find matching bucket
    for (const b of buckets) {
      if (time >= b.start && time <= b.end) {
        b.count++
        break
      }
    }
  }
  
  return buckets.map(b => ({ label: b.label, count: b.count }))
}

const FILTER_SUBTITLES: Record<"activity" | "registrations", Record<TimeFilter, string>> = {
  activity: {
    daily: "Check-ins over the last 7 days",
    weekly: "Check-ins over the last 8 weeks",
    yearly: "Check-ins over the last 12 months",
  },
  registrations: {
    daily: "New customers in the last 7 days",
    weekly: "New customers over the last 8 weeks",
    yearly: "New customers over the last 12 months",
  },
}

// ---------------------------------------------------------------------------
// FilterToggle component
// ---------------------------------------------------------------------------
const FILTERS: { label: string; value: TimeFilter }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Yearly", value: "yearly" },
]
function FilterToggle({ value, onChange }: { value: TimeFilter; onChange: (v: TimeFilter) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
            value === f.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom tooltip shared by all charts
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">{p.name ?? "Value"}: <span className="font-semibold text-primary">{p.value}</span></p>
      ))}
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
      /* ── Charts Row: Daily Activity + New Registrations ─────────────── */
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border border-border shadow-sm lg:col-span-3">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-sm font-semibold">Daily Activity</CardTitle>
                <p className="text-xs text-muted-foreground">{FILTER_SUBTITLES.activity[activityFilter]}</p>
              </div>
              <FilterToggle value={activityFilter} onChange={setActivityFilter} />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyActivity} barCategoryGap="30%">
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                <Bar dataKey="count" name="Customers" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-sm font-semibold">New Registrations</CardTitle>
                <p className="text-xs text-muted-foreground">{FILTER_SUBTITLES.registrations[registrationsFilter]}</p>
              </div>
              <FilterToggle value={registrationsFilter} onChange={setRegistrationsFilter} />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer key={`registrations-${registrationsFilter}`} width="100%" height={200}>
              <AreaChart data={monthlyGrowth}>
                <defs>
                  <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Registered"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#regGradient)"
                  dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-background)", fill: "var(--color-primary)" }}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
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
          <div className="space-y-4 pt-2">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted-foreground">New Registrations Over Time</p>
              <FilterToggle value={registrationsFilter} onChange={setRegistrationsFilter} />
            </div>
            <ResponsiveContainer key={`modal-registrations-${registrationsFilter}-${openModal}`} width="100%" height={300}>
              <AreaChart data={monthlyGrowth}>
                <defs>
                  <linearGradient id="regGradientModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Registered"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#regGradientModal)"
                  dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-background)", fill: "var(--color-primary)" }}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">{FILTER_SUBTITLES.registrations[registrationsFilter]}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Active NFC Cards ────────────────────────────────────── */}
      <Dialog open={openModal === "cards"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Active NFC Cards</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Active Cards</p>
                <p className="text-3xl font-bold">{stats.activeCards}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Customers</p>
                <p className="text-3xl font-bold">{stats.totalCustomers}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Linked Rate</p>
                <p className="text-3xl font-bold">{stats.totalCustomers > 0 ? Math.round((stats.activeCards / stats.totalCustomers) * 100) : 0}%</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-3">Cards Added Over Time</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyGrowth} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                  <Bar dataKey="count" name="Cards" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Total Visits ────────────────────────────────────────── */}
      <Dialog open={openModal === "visits"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Total Visits</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Visits</p>
                <p className="text-3xl font-bold">{stats.totalVisits}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Visits per Customer</p>
                <p className="text-3xl font-bold">{stats.totalCustomers > 0 ? (stats.totalVisits / stats.totalCustomers).toFixed(1) : 0}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Daily Activity</p>
                <FilterToggle value={activityFilter} onChange={setActivityFilter} />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyActivity} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                  <Bar dataKey="count" name="Visits" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">{FILTER_SUBTITLES.activity[activityFilter]}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Recent Activity ──────────────────────────────────────── */}
      <Dialog open={openModal === "activity"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-sm border border-border shadow-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Recent Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-1">Last 7 Days</p>
              <p className="text-3xl font-bold">{stats.recentActivity}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Check-ins This Week</p>
                <FilterToggle value={activityFilter} onChange={setActivityFilter} />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyActivity} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                  <Bar dataKey="count" name="Check-ins" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">{FILTER_SUBTITLES.activity[activityFilter]}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
