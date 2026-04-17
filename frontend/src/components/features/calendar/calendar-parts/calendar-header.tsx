/**
 * Calendar Header
 * ===============
 *
 * Top toolbar with date navigation, view mode toggle (Day / Week / Month),
 * interval toggle (15 / 30 / 60 min), and a "New Appointment" action button.
 */

import { ChevronLeft, ChevronRight, CalendarPlus, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { IntervalMinutes, ViewMode } from "@/types/appointment"
import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
} from "date-fns"
import { useAuth } from "@/contexts/auth-context"

interface CalendarHeaderProps {
  selectedDate: Date
  interval: IntervalMinutes
  viewMode: ViewMode
  showTableView: boolean
  onDateChange: (date: Date) => void
  onIntervalChange: (interval: IntervalMinutes) => void
  onViewModeChange: (mode: ViewMode) => void
  onNewAppointment: () => void
  onToggleTableView: () => void
}

const INTERVALS: IntervalMinutes[] = [15, 30, 60]
const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

export function CalendarHeader({
  selectedDate,
  interval,
  viewMode,
  showTableView,
  onDateChange,
  onIntervalChange,
  onViewModeChange,
  onNewAppointment,
  onToggleTableView,
}: CalendarHeaderProps) {
  const { userProfile } = useAuth()
  const canCreateAppointments = userProfile?.role === "staff" || userProfile?.role === "super_admin" || userProfile?.role === "branch_admin"
  const prev = () => {
    if (viewMode === "day") {
      onDateChange(addDays(selectedDate, -1))
    } else if (viewMode === "week") {
      onDateChange(subWeeks(selectedDate, 1))
    } else {
      onDateChange(subMonths(selectedDate, 1))
    }
  }

  const next = () => {
    if (viewMode === "day") {
      onDateChange(addDays(selectedDate, 1))
    } else if (viewMode === "week") {
      onDateChange(addWeeks(selectedDate, 1))
    } else {
      onDateChange(addMonths(selectedDate, 1))
    }
  }

  const goToday = () => onDateChange(new Date())

  let dateLabel: string
  if (viewMode === "day") {
    dateLabel = format(selectedDate, "EEEE, MMMM d, yyyy")
  } else if (viewMode === "week") {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
    dateLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
  } else {
    dateLabel = format(selectedDate, "MMMM yyyy")
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      {/* ---- left: date navigation ---- */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={prev} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>
        <Button variant="outline" size="icon-sm" onClick={next} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!showTableView && (
          <h2 className="ml-2 text-base font-semibold sm:text-lg">{dateLabel}</h2>
        )}
      </div>

      {/* ---- right: view mode + interval toggle + settings + new button ---- */}
      <div className="flex items-center gap-2.5">
        {/* table view toggle button */}
        <Button
          variant={showTableView ? "default" : "outline"}
          size="sm"
          onClick={onToggleTableView}
          title={showTableView ? "Show calendar view" : "Show table view"}
          className={showTableView ? "" : ""}
        >
          <List className="mr-1.5 h-4 w-4" />
          {showTableView ? "Calendar" : "Table"}
        </Button>

        {/* view mode selector (hide when showing table view) */}
        {!showTableView && (
        <div className="flex items-center rounded-lg border p-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === mode.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
        )}

        {/* interval selector (only visible in day/week view and not in table view) */}
        {!showTableView && viewMode !== "month" && (
        <div className="flex items-center rounded-lg border p-1">
          {INTERVALS.map((int) => (
            <button
              key={int}
              onClick={() => onIntervalChange(int)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                interval === int
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {int}m
            </button>
          ))}
        </div>
        )}

        {!showTableView && canCreateAppointments && (
          <Button 
            size="sm" 
            onClick={onNewAppointment}
            title="Create a new appointment"
          >
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            New Appointment
          </Button>
        )}
      </div>
    </div>
  )
}
