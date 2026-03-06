/**
 * Calendar Header
 * ===============
 *
 * Top toolbar with date navigation, interval toggle (15 / 30 / 60 min),
 * and a "New Appointment" action button.
 */

import { ChevronLeft, ChevronRight, CalendarPlus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { IntervalMinutes } from "@/types/appointment"

interface CalendarHeaderProps {
  selectedDate: Date
  interval: IntervalMinutes
  onDateChange: (date: Date) => void
  onIntervalChange: (interval: IntervalMinutes) => void
  onNewAppointment: () => void
  onOpenSettings: () => void
}

const INTERVALS: IntervalMinutes[] = [15, 30, 60]

export function CalendarHeader({
  selectedDate,
  interval,
  onDateChange,
  onIntervalChange,
  onNewAppointment,
  onOpenSettings,
}: CalendarHeaderProps) {
  const prevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    onDateChange(d)
  }

  const nextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    onDateChange(d)
  }

  const goToday = () => onDateChange(new Date())

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      {/* ---- left: date navigation ---- */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={prevDay} aria-label="Previous day">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>
        <Button variant="outline" size="icon-sm" onClick={nextDay} aria-label="Next day">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="ml-2 text-base font-semibold sm:text-lg">{dateLabel}</h2>
      </div>

      {/* ---- right: interval toggle + settings + new button ---- */}
      <div className="flex items-center gap-2.5">
        {/* interval selector */}
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

        {/* settings button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onOpenSettings}
          title="Calendar settings"
          aria-label="Open calendar settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button size="sm" onClick={onNewAppointment}>
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          New Appointment
        </Button>
      </div>
    </div>
  )
}
