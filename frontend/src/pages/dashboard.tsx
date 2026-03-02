import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCounter } from "@/hooks/use-counter"
import { useAuth } from "@/contexts/auth-context"
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DailyActivity { day: string; customers: number }
interface MonthlyGrowth { month: string; registered: number }

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
// Component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { user } = useAuth()

  const [stats, setStats] = useState({ totalCustomers: 0, activeCards: 0, totalVisits: 0, recentActivity: 0 })
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [monthlyGrowth, setMonthlyGrowth] = useState<MonthlyGrowth[]>([])
  const [loading, setLoading] = useState(true)

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

      const rows = customers ?? []
      const totalCustomers = rows.length
      const activeCards = rows.filter((row) => row.nfc_uid !== null).length
      const totalVisits = rows.reduce((sum, row) => sum + (row.visits || 0), 0)

      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoIso = sevenDaysAgo.toISOString()
      const recentActivity = rows.filter((row) => row.last_visit && row.last_visit >= sevenDaysAgoIso).length

      setStats({
        totalCustomers,
        activeCards,
        totalVisits,
        recentActivity,
      })

      // ── Daily activity bar (last 7 days) ──────────────────────────────────
      const dayCounts: Record<string, number> = {}
      const days: string[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })
        dayCounts[d.toISOString().slice(0, 10)] = 0
        days.push(key)
      }
      const isoKeys = Object.keys(dayCounts)
      rows.forEach((row) => {
        if (!row.last_visit) return
        const iso = row.last_visit.slice(0, 10)
        if (iso in dayCounts) dayCounts[iso]++
      })
      setDailyActivity(isoKeys.map((iso, i) => ({ day: days[i], customers: dayCounts[iso] })))

      // ── Monthly registrations line (last 6 months) ────────────────────────
      const monthCounts: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
        monthCounts[key] = 0
      }
      rows.forEach((row) => {
        if (!row.created_at) return
        const d = new Date(row.created_at)
        const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
        if (key in monthCounts) monthCounts[key]++
      })
      setMonthlyGrowth(Object.entries(monthCounts).map(([month, registered]) => ({ month, registered })))

    } catch (err) {
      console.error("Dashboard load error:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── Stat cards config ────────────────────────────────────────────────────
  const statCards = [
    { title: "Total Customers", value: loading ? "—" : totalCustomersCount.toLocaleString(), sub: "Registered", icon: Users },
    { title: "Active NFC Cards", value: loading ? "—" : activeCardsCount.toLocaleString(), sub: "Linked cards", icon: CreditCard },
    { title: "Total Visits", value: loading ? "—" : totalVisitsCount.toLocaleString(), sub: "All-time", icon: TrendingUp },
    { title: "Recent Activity", value: loading ? "—" : recentActivityCount.toLocaleString(), sub: "Last 7 days", icon: Activity },
  ]

  return (
    <div className="space-y-6 pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Admin"}
          </h1>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">FG Aesthetic Centre</p>
          <p className="text-xs font-medium text-primary">NFC Loyalty Dashboard</p>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ title, value, sub, icon: Icon }) => (
          <Card key={title} className="border border-border shadow-sm">
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

      {/* ── Charts Row 1: Daily Activity + Monthly Growth ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Daily Activity Bar Chart */}
        <Card className="border border-border shadow-sm lg:col-span-3">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Daily Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Customer check-ins over the last 7 days</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyActivity} barCategoryGap="30%">
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
                <Bar dataKey="customers" name="Customers" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Growth Line Chart */}
        <Card className="border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">New Registrations</CardTitle>
            <p className="text-xs text-muted-foreground">Customers joined per month</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyGrowth}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="registered"
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

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="grid gap-4">

        {/* Quick Actions */}
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
              <a
                key={label}
                href={href}
                className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{desc}</p>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
