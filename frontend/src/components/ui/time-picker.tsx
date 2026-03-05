/**
 * Time Picker Component
 * =====================
 *
 * A user-friendly time picker with hour and minute selection.
 * Uses 12-hour format with AM/PM toggle.
 */

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimePickerProps {
  value?: string // HH:MM format (24-hour, stored as 00:00-23:59)
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
  minuteStep?: 15 | 30 | 60
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Convert 24-hour time (HH:MM) to 12-hour display (H:MM AM/PM) */
function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return "Select time"
  const [h, m] = timeStr.split(":").map(Number)
  const hour24 = h % 24
  const hour12 = hour24 % 12 || 12
  const period = hour24 < 12 ? "AM" : "PM"
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`
}

/** Convert 12-hour values to 24-hour string */
function time12to24(hour12: number, minute: number, isAM: boolean): string {
  let hour24 = hour12 % 12
  if (!isAM) hour24 += 12
  return `${hour24.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

/** Parse 24-hour time string to 12-hour + AM/PM */
function parse24To12(timeStr: string): { hour12: number; minute: number; isAM: boolean } {
  if (!timeStr) return { hour12: 9, minute: 0, isAM: true }
  const [h, m] = timeStr.split(":").map(Number)
  const hour24 = h % 24
  const isAM = hour24 < 12
  const hour12 = hour24 % 12 || 12
  return { hour12, minute: m, isAM }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimePicker({
  value = "",
  onChange,
  className,
  disabled = false,
  minuteStep = 15,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hour12, setHour12] = React.useState(9)
  const [minute, setMinute] = React.useState(0)
  const [isAM, setIsAM] = React.useState(true)

  // Parse value when it changes
  React.useEffect(() => {
    if (value) {
      const { hour12: h, minute: m, isAM: am } = parse24To12(value)
      setHour12(h)
      setMinute(m)
      setIsAM(am)
    }
  }, [value])

  const handleApply = () => {
    const timeString = time12to24(hour12, minute, isAM)
    onChange?.(timeString)
    setOpen(false)
  }

  const displayValue = formatTimeDisplay(value)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12
  const minutes = Array.from(
    { length: 60 / minuteStep },
    (_, i) => i * minuteStep
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground">Select Time</Label>
          </div>
          <div className="flex gap-2">
            {/* Hour picker */}
            <div className="flex flex-col gap-1">
              <Label className="text-center text-xs font-medium">Hour</Label>
              <div className="flex h-48 w-16 flex-col overflow-y-auto rounded-md border">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour12(h)}
                    className={cn(
                      "flex-none px-3 py-1.5 text-sm hover:bg-accent",
                      h === hour12 && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minute picker */}
            <div className="flex flex-col gap-1">
              <Label className="text-center text-xs font-medium">Min</Label>
              <div className="flex h-48 w-16 flex-col overflow-y-auto rounded-md border">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    className={cn(
                      "flex-none px-3 py-1.5 text-sm hover:bg-accent",
                      m === minute && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {m.toString().padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM toggle */}
            <div className="flex flex-col gap-1">
              <Label className="text-center text-xs font-medium">Period</Label>
              <div className="flex h-48 w-16 flex-col overflow-y-auto rounded-md border">
                {["AM", "PM"].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setIsAM(period === "AM")}
                    className={cn(
                      "flex-none px-3 py-1.5 text-sm hover:bg-accent",
                      (isAM && period === "AM" || !isAM && period === "PM") && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
