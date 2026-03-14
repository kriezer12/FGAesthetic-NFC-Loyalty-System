/**
 * Calendar Month Grid
 * ===================
 *
 * A traditional month-view calendar grid. Each day cell shows appointment
 * counts/summaries. Clicking a day switches to the day view.
 */

import { useMemo } from "react"
import type { Appointment, StaffMember } from "@/types/appointment"
import { cn } from "@/lib/utils"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday as isTodayFn,
  format,
} from "date-fns"

// ---------------------------------------------------------------------------
// Status colours for the tiny dots
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-yellow-400",
  confirmed: "bg-green-400",
  "in-progress": "bg-blue-400",
  completed: "bg-gray-400",
  cancelled: "bg-red-400/50",
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalendarMonthGridProps {
  selectedDate: Date
  staff: StaffMember[]
  appointments: Appointment[]
  onDayClick: (date: Date) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MAX_VISIBLE_APPOINTMENTS = 3

export function CalendarMonthGrid({
  selectedDate,
  staff,
  appointments,
  onDayClick,
}: CalendarMonthGridProps) {
  // Build a staff color lookup
  const staffColorMap = useMemo(() => {
    const map = new Map<string, string>()
    staff.forEach((s) => map.set(s.id, s.color))
    return map
  }, [staff])

  // Compute the calendar grid days (fill surrounding weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [selectedDate])

  // Group appointments by date key
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    appointments.forEach((a) => {
      if (a.status === "cancelled") return
      const key = format(new Date(a.start_time), "yyyy-MM-dd")
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    })
    return map
  }, [appointments])

  // Split into weeks (rows of 7)
  const weeks = useMemo(() => {
    const rows: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7))
    }
    return rows
  }, [calendarDays])

  return (
    <div className="flex flex-1 flex-col h-full overflow-auto p-2">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b pb-1 mb-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium uppercase text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="grid flex-1 auto-rows-fr gap-px">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayAppts = appointmentsByDate.get(key) ?? []
              const isCurrentMonth = isSameMonth(day, selectedDate)
              const today = isTodayFn(day)

              return (
                <div
                  key={key}
                  className={cn(
                    "group relative flex min-h-[80px] flex-col rounded-md border p-1.5 cursor-pointer transition-colors hover:bg-accent/30",
                    !isCurrentMonth && "opacity-40",
                    today && "border-primary/50 bg-primary/[0.03]",
                  )}
                  onClick={() => onDayClick(day)}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      today && "bg-primary text-primary-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Appointment list */}
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    {dayAppts.slice(0, MAX_VISIBLE_APPOINTMENTS).map((appt) => {
                      const color = staffColorMap.get(appt.staff_id) ?? "#6366f1"
                      return (
                        <div
                          key={appt.id}
                          className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate"
                          style={{ backgroundColor: `${color}20` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              STATUS_COLOR[appt.status] ?? "bg-gray-400",
                            )}
                          />
                          <span className="truncate font-medium">{appt.title}</span>
                        </div>
                      )
                    })}
                    {dayAppts.length > MAX_VISIBLE_APPOINTMENTS && (
                      <span className="px-1 text-[10px] font-medium text-muted-foreground">
                        +{dayAppts.length - MAX_VISIBLE_APPOINTMENTS} more
                      </span>
                    )}
                  </div>

                  {/* Appointment count badge (top-right) */}
                  {dayAppts.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary">
                      {dayAppts.length}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
