import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

import { ROSE, VIOLET, FILTER_SUBTITLES, FILTERS, TimeFilter } from "./dashboard-shared"

interface ChartPoint { label: string; count: number }

function FilterToggle({ value, onChange }: { value: TimeFilter; onChange: (v: TimeFilter) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
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
    <div className="rounded-xl border border-border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name ?? "Value"}: <span className="font-bold text-primary">{p.value}</span>
        </p>
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


interface DashboardChartsProps {
  dailyActivity: ChartPoint[]
  monthlyGrowth: ChartPoint[]
  activityFilter: TimeFilter
  registrationsFilter: TimeFilter
  onActivityFilterChange: (v: TimeFilter) => void
  onRegistrationsFilterChange: (v: TimeFilter) => void
}

export function DashboardCharts({
  dailyActivity,
  monthlyGrowth,
  activityFilter,
  registrationsFilter,
  onActivityFilterChange,
  onRegistrationsFilterChange,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* ── Daily Activity BarChart ── */}
      <Card className="border border-border shadow-sm lg:col-span-3 overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle as="h3" className="text-lg font-bold">Daily Activity</CardTitle>
              <p className="text-xs text-muted-foreground">{FILTER_SUBTITLES.activity[activityFilter]}</p>
            </div>
            <FilterToggle value={activityFilter} onChange={onActivityFilterChange} />
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <ChartDataTable data={dailyActivity} title="Daily Activity" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyActivity} barCategoryGap="30%">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ROSE} stopOpacity={1} />
                  <stop offset="100%" stopColor={ROSE} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: "12px", fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)", radius: 4 }} />
              <Bar dataKey="count" name="Customers" fill="url(#barGradient)" radius={[6, 6, 0, 0]} isAnimationActive animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── New Registrations AreaChart ── */}
      <Card className="border border-border shadow-sm lg:col-span-2 overflow-hidden">
        <CardHeader className="pb-0 pt-2 px-5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle as="h3" className="text-lg font-bold">New Registrations</CardTitle>
              <p className="text-xs text-muted-foreground">{FILTER_SUBTITLES.registrations[registrationsFilter]}</p>
            </div>
            <FilterToggle value={registrationsFilter} onChange={onRegistrationsFilterChange} />
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <ChartDataTable data={monthlyGrowth} title="New Registrations" />
          <ResponsiveContainer key={`registrations-${registrationsFilter}`} width="100%" height={200}>
            <AreaChart data={monthlyGrowth}>
              <defs>
                <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ROSE} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={ROSE} stopOpacity={0.02} />
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
                stroke={ROSE}
                strokeWidth={2.5}
                fill="url(#regGradient)"
                dot={{ r: 3.5, fill: ROSE, strokeWidth: 0 }}
                activeDot={{ r: 5.5, strokeWidth: 2, stroke: "var(--color-background)", fill: ROSE }}
                isAnimationActive
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardCharts;
