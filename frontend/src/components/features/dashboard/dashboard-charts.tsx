import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

import { GOLD, FILTER_SUBTITLES, FILTERS, TimeFilter } from "./dashboard-shared"

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
      <Card className="border border-border shadow-sm lg:col-span-3">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold">Daily Activity</CardTitle>
              <p className="text-xs text-muted-foreground">{FILTER_SUBTITLES.activity[activityFilter]}</p>
            </div>
            <FilterToggle value={activityFilter} onChange={onActivityFilterChange} />
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
            <FilterToggle value={registrationsFilter} onChange={onRegistrationsFilterChange} />
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
  )
}

export default DashboardCharts;
