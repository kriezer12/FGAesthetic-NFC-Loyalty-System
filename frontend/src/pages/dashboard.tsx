import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, CreditCard, TrendingUp, Activity, LayoutDashboard, GripVertical, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCounter } from "@/hooks/use-counter"
import { useAuth } from "@/contexts/auth-context"
import {
  BarChart, Bar, LineChart, Line,
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
function buildDailyPoints(rows: RawRow[], dateKey: "last_visit" | "created_at"): ChartPoint[] {
  const counts: Record<string, number> = {}
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    counts[d.toISOString().slice(0, 10)] = 0
    labels.push(d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }))
  }
  const isoKeys = Object.keys(counts)
  rows.forEach((row) => {
    const val = row[dateKey]; if (!val) return
    const iso = val.slice(0, 10)
    if (iso in counts) counts[iso]++
  })
  return isoKeys.map((iso, i) => ({ label: labels[i], count: counts[iso] }))
}

function buildWeeklyPoints(rows: RawRow[], dateKey: "last_visit" | "created_at"): ChartPoint[] {
  const weeks: { label: string; start: Date; end: Date; count: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const end = new Date(); end.setDate(end.getDate() - i * 7)
    const start = new Date(end); start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999)
    weeks.push({ label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), start, end, count: 0 })
  }
  rows.forEach((row) => {
    const val = row[dateKey]; if (!val) return
    const d = new Date(val)
    for (const w of weeks) { if (d >= w.start && d <= w.end) { w.count++; break } }
  })
  return weeks.map(({ label, count }) => ({ label, count }))
}

function buildYearlyPoints(rows: RawRow[], dateKey: "last_visit" | "created_at"): ChartPoint[] {
  const counts: Record<string, number> = {}
  const labels: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    counts[key] = 0; labels.push(key)
  }
  rows.forEach((row) => {
    const val = row[dateKey]; if (!val) return
    const key = new Date(val).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    if (key in counts) counts[key]++
  })
  return labels.map((label) => ({ label, count: counts[label] }))
}

function computeChart(rows: RawRow[], filter: TimeFilter, dateKey: "last_visit" | "created_at"): ChartPoint[] {
  if (filter === "daily") return buildDailyPoints(rows, dateKey)
  if (filter === "weekly") return buildWeeklyPoints(rows, dateKey)
  return buildYearlyPoints(rows, dateKey)
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
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                <Bar dataKey="count" name="Customers" fill={GOLD} radius={[4, 4, 0, 0]} />
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
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyGrowth}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Registered"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={{ r: 4, fill: GOLD, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
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
          {[
            { href: "/dashboard/scan", icon: CreditCard, label: "Scan NFC Card", desc: "Register or look up a customer" },
            { href: "/dashboard/customers", icon: Users, label: "Customer Directory", desc: "Browse and manage profiles" },
            { href: "/dashboard/checkin-logs", icon: Activity, label: "Check-in Logs", desc: "View full visit history" },
            { href: "/dashboard/scan", icon: TrendingUp, label: "Register New Card", desc: "Link a card to a customer" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={label}
              to={href}
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
          ))}
        </CardContent>
      </Card>
    ),
  }), [statCards, activityFilter, registrationsFilter, dailyActivity, monthlyGrowth])

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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyGrowth}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Registered"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={{ r: 4, fill: GOLD, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">{FILTER_SUBTITLES.registrations[registrationsFilter]}</p>
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
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                  <Bar dataKey="count" name="Cards" fill={GOLD} radius={[4, 4, 0, 0]} />
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
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                  <Bar dataKey="count" name="Visits" fill={GOLD} radius={[4, 4, 0, 0]} />
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
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                  <Bar dataKey="count" name="Check-ins" fill={GOLD} radius={[4, 4, 0, 0]} />
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
