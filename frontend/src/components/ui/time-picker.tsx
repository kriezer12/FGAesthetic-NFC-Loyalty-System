/**
 * Time Picker Component
 * =====================
 *
 * A user-friendly time picker that combines a typeable input with a
 * scrollable dropdown of time slots. Users can either type a time
 * (e.g. "2:30 PM", "14:30") or pick from the list.
 * Uses 12-hour display format, stores 24-hour HH:MM values.
 */

import * as React from "react"
import { Clock, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimePickerProps {
  value?: string // HH:MM format (24-hour, stored as 00:00-23:59)
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
  minuteStep?: 15 | 30 | 60
  minTime?: string // HH:MM
  maxTime?: string // HH:MM
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Convert 24-hour time (HH:MM) to 12-hour display (h:mm AM/PM) */
function to12Hour(timeStr: string): string {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const hour24 = h % 24
  const hour12 = hour24 % 12 || 12
  const period = hour24 < 12 ? "AM" : "PM"
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`
}

/** Generate all time slot values for a given step, constrained by optional min/max times */
function generateSlots(step: number, minTime?: string, maxTime?: string): string[] {
  const slots: string[] = []
  
  let minMins = 0;
  if (minTime) {
    const [h, m] = minTime.split(":").map(Number);
    minMins = h * 60 + (m || 0);
  }
  
  let maxMins = 24 * 60;
  if (maxTime) {
    const [h, m] = maxTime.split(":").map(Number);
    maxMins = h * 60 + (m || 0);
  }

  for (let mins = 0; mins < 24 * 60; mins += step) {
    if (mins >= minMins && mins <= maxMins) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
    }
  }
  // Also push maxTime if it's not exactly on a step boundary, though typically it is.
  if (maxTime && !slots.includes(maxTime)) {
    slots.push(maxTime)
  }
  return slots
}

/**
 * Try to parse a freeform time string into 24-hour HH:MM.
 * Accepts: "2:30 PM", "2:30PM", "14:30", "2 PM", "2pm", etc.
 * Returns null if unparseable.
 */
function parseTimeInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Match patterns like "2:30 PM", "2:30pm", "14:30", "2 pm", "2pm"
  const match = trimmed.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?$/,
  )
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const period = match[3]?.toUpperCase()

  if (minute < 0 || minute > 59) return null

  if (period) {
    // 12-hour input
    if (hour < 1 || hour > 12) return null
    if (period === "AM") {
      hour = hour === 12 ? 0 : hour
    } else {
      hour = hour === 12 ? 12 : hour + 12
    }
  } else {
    // 24-hour input
    if (hour < 0 || hour > 23) return null
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
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
  minTime,
  maxTime,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const activeRef = React.useRef<HTMLButtonElement | null>(null)

  const slots = React.useMemo(() => generateSlots(minuteStep, minTime, maxTime), [minuteStep, minTime, maxTime])

  // Sync display text when the controlled value changes (and the popover isn't focused for typing)
  React.useEffect(() => {
    if (!open) {
      setInputValue(to12Hour(value))
    }
  }, [value, open])

  // Scroll to the active slot when the popover opens
  React.useEffect(() => {
    if (open) {
      // Small delay to let the DOM render
      const t = setTimeout(() => {
        activeRef.current?.scrollIntoView({ block: "center" })
      }, 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSelect = (slot: string) => {
    onChange?.(slot)
    setInputValue(to12Hour(slot))
    setOpen(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const parsed = parseTimeInput(inputValue)
      if (parsed) {
        onChange?.(parsed)
        setInputValue(to12Hour(parsed))
        setOpen(false)
      }
    }
    if (e.key === "Escape") {
      setInputValue(to12Hour(value))
      setOpen(false)
    }
  }

  const handleInputBlur = () => {
    // Try to parse what's typed; if valid, commit it
    const parsed = parseTimeInput(inputValue)
    if (parsed) {
      onChange?.(parsed)
      setInputValue(to12Hour(parsed))
    } else {
      // Revert to current value
      setInputValue(to12Hour(value))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-transparent px-3 text-sm shadow-xs",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            disabled={disabled}
            placeholder="e.g. 2:30 PM"
            value={inputValue}
            size={1}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollArea className="h-56">
          <div className="py-1">
            {slots.map((slot) => {
              const isActive = slot === value
              return (
                <button
                  key={slot}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent the input blur from firing before the click registers
                    e.preventDefault()
                    handleSelect(slot)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent font-medium"
                      : "hover:bg-accent/50",
                  )}
                >
                  {to12Hour(slot)}
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
