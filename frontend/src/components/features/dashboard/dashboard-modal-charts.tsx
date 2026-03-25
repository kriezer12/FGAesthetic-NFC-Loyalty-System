import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

import { GOLD, FILTER_SUBTITLES, FILTERS, TimeFilter } from "./dashboard-shared"

interface ChartPoint { label: string; count: number }

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

function ChartDataTable({ data, title }: { data: Array<{ label: string; count: number }>; title: string }) {
  return (
    <div className="sr-only">
      <table aria-label={`${title} tabular data`}>
        <thead>
          <tr>
            <th scope="col">Time Period</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


interface ModalChartProps {
  type: "customers" | "cards" | "visits" | "activity"
  data: ChartPoint[]
  filter: TimeFilter
  onFilterChange: (v: TimeFilter) => void
  stats: {
    activeCards: number
    totalCustomers: number
    totalVisits: number
    recentActivity: number
  }
}

export function DashboardModalCharts({ type, data, filter, onFilterChange, stats }: ModalChartProps) {
  if (type === "customers") {
    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-sm font-semibold text-muted-foreground">New Registrations Over Time</h3>
          <FilterToggle value={filter} onChange={onFilterChange} />
        </div>
        <ChartDataTable data={data} title="New Registrations Over Time" />
        <ResponsiveContainer width="100%" height={300}>

          <AreaChart data={data}>
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
        <p className="text-xs text-muted-foreground mt-2">{FILTER_SUBTITLES.registrations[filter]}</p>
      </div>
    )
  }

  if (type === "cards") {
    return (
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
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Cards Added Over Time</h3>
          <ChartDataTable data={data} title="Cards Added Over Time" />
          <ResponsiveContainer width="100%" height={250}>

            <BarChart data={data} barCategoryGap="30%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
              <Bar dataKey="count" name="Cards" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === "visits") {
    return (
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
            <h3 className="text-sm font-semibold text-muted-foreground">Daily Activity</h3>
            <FilterToggle value={filter} onChange={onFilterChange} />
          </div>
          <ChartDataTable data={data} title="Daily Activity" />
          <ResponsiveContainer width="100%" height={250}>

            <BarChart data={data} barCategoryGap="30%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
              <Bar dataKey="count" name="Visits" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">{FILTER_SUBTITLES.activity[filter]}</p>
        </div>
      </div>
    )
  }

  if (type === "activity") {
    return (
      <div className="space-y-4 pt-2">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground mb-1">Last 7 Days</p>
          <p className="text-3xl font-bold">{stats.recentActivity}</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Check-ins This Week</h3>
            <FilterToggle value={filter} onChange={onFilterChange} />
          </div>
          <ChartDataTable data={data} title="Check-ins This Week" />
          <ResponsiveContainer width="100%" height={250}>

            <BarChart data={data} barCategoryGap="30%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
              <Bar dataKey="count" name="Check-ins" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">{FILTER_SUBTITLES.activity[filter]}</p>
        </div>
      </div>
    )
  }

  return null
}

export default DashboardModalCharts;
