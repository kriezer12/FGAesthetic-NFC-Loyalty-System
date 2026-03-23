/**
 * Time Picker Component
 * =====================
 *
 * Combines a typeable auto-formatting input with segmented dropdowns.
 * - Type freely (e.g. "2:30 PM", "14:30", "230p") — auto-formatted on blur/Enter
 * - Or click the hour / minute / AM-PM segments to open a scrollable dropdown
 * - Arrow keys and scroll wheel work on focused segments
 *
 * Uses 12-hour display format, stores 24-hour HH:MM values.
 */

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimePickerProps {
  value?: string   // HH:MM format (24-hour)
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
  minuteStep?: number
  minTime?: string // HH:MM
  maxTime?: string // HH:MM
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function parse24(time: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  if (!time) return { hour12: 12, minute: 0, period: "AM" }
  const [h, m] = time.split(":").map(Number)
  const hour24 = (h ?? 0) % 24
  return {
    hour12: hour24 % 12 || 12,
    minute: m ?? 0,
    period: hour24 < 12 ? "AM" : "PM",
  }
}

function to24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12
  if (period === "PM") h += 12
  return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

function to12Display(h12: number, minute: number, period: "AM" | "PM"): string {
  return `${h12.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${period}`
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * Parse a freeform time string into 24-hour HH:MM.
 * Accepts: "2:30 PM", "230p", "14:30", "2pm", "930", "9", etc.
 */
function parseTimeInput(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, " ")
  if (!s) return null

  // Match: optional digits, optional colon+minutes, optional am/pm
  const match = s.match(/^(\d{1,4})(?::?(\d{2}))?\s*(am?|pm?)?$/i)
  if (!match) return null

  let hourStr = match[1]
  const minStr = match[2] ?? ""
  const period = match[3]?.toLowerCase()

  let hour: number
  let minute: number

  // If no colon and no period marker, parse as a compact number e.g. "230" → h=2 m=30, "1430" → h=14 m=30
  if (!match[2] && !period && hourStr.length > 2) {
    minute = parseInt(hourStr.slice(-2), 10)
    hour = parseInt(hourStr.slice(0, -2), 10)
  } else {
    hour = parseInt(hourStr, 10)
    minute = minStr ? parseInt(minStr, 10) : 0
  }

  if (isNaN(hour) || isNaN(minute)) return null
  if (minute < 0 || minute > 59) return null

  if (period) {
    // 12-hour interpretation
    if (hour < 1 || hour > 12) return null
    const isPM = period.startsWith("p")
    hour = hour === 12 ? (isPM ? 12 : 0) : isPM ? hour + 12 : hour
  } else {
    if (hour > 23) return null
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

/**
 * Auto-format as the user types — insert colon and keep mask tidy.
 * Returns a lightly-formatted display string (raw while typing, not fully validated).
 */
function autoFormat(raw: string): string {
  // Strip everything except digits, colon, space and letters (for am/pm)
  let s = raw.replace(/[^0-9:aApP\s]/g, "")

  // Auto-insert colon after 2 digits if none present
  if (/^\d{2}$/.test(s)) {
    s = s + ":"
  }
  // After 4+ raw digits with no colon, insert colon at position 2
  if (/^\d{4,}$/.test(s)) {
    s = s.slice(0, 2) + ":" + s.slice(2)
  }
  return s
}

// ---------------------------------------------------------------------------
// SegmentDropdown
// ---------------------------------------------------------------------------

interface SegmentDropdownProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  anchorRef: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
}

function SegmentDropdown({ open, onOpenChange, anchorRef, children }: SegmentDropdownProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onOpenChange(false)
      }
    }
    // Use a slight delay so the triggering click doesn't immediately close
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener("mousedown", handler)
    }
  }, [open, onOpenChange, anchorRef])

  if (!open) return null

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "absolute z-50 mt-1 min-w-[5rem] rounded-md border bg-popover text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-100",
      )}
      style={{ top: "100%", left: 0 }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TimePicker
// ---------------------------------------------------------------------------

export function TimePicker({
  value = "",
  onChange,
  className,
  disabled = false,
  minuteStep = 1,
  minTime,
  maxTime,
}: TimePickerProps) {
  const { hour12, minute, period } = parse24(value)

  // Text input state
  const [inputMode, setInputMode] = React.useState(false)
  const [inputText, setInputText] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Segment dropdown state
  const [openSegment, setOpenSegment] = React.useState<"hour" | "minute" | "period" | null>(null)

  // Keyboard typing buffers for segment mode
  const [hourBuf, setHourBuf] = React.useState("")
  const [minBuf, setMinBuf] = React.useState("")
  const hourBufTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const minBufTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  // Refs for dropdown positioning
  const hourAnchorRef = React.useRef<HTMLDivElement>(null)
  const minuteAnchorRef = React.useRef<HTMLDivElement>(null)
  const periodAnchorRef = React.useRef<HTMLDivElement>(null)

  // Refs for scroll-to-active
  const activeHourRef = React.useRef<HTMLButtonElement | null>(null)
  const activeMinRef = React.useRef<HTMLButtonElement | null>(null)
  const activePeriodRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (openSegment === "hour")   setTimeout(() => activeHourRef.current?.scrollIntoView({ block: "center" }), 30)
    if (openSegment === "minute") setTimeout(() => activeMinRef.current?.scrollIntoView({ block: "center" }), 30)
    if (openSegment === "period") setTimeout(() => activePeriodRef.current?.scrollIntoView({ block: "center" }), 30)
  }, [openSegment])

  React.useEffect(() => () => {
    clearTimeout(hourBufTimer.current)
    clearTimeout(minBufTimer.current)
  }, [])

  /** Emit new value clamped to min/max */
  const emit = React.useCallback((h12: number, m: number, p: "AM" | "PM") => {
    let v = to24(h12, m, p)
    if (minTime && toMinutes(v) < toMinutes(minTime)) v = minTime
    if (maxTime && toMinutes(v) > toMinutes(maxTime)) v = maxTime
    onChange?.(v)
  }, [onChange, minTime, maxTime])

  // ---- hour ----
  const setHour = (h: number) => emit(h, minute, period)
  const incrHour = () => setHour(hour12 >= 12 ? 1 : hour12 + 1)
  const decrHour = () => setHour(hour12 <= 1 ? 12 : hour12 - 1)

  // ---- minute ----
  const setMinute = (m: number) => emit(hour12, m, period)
  const incrMinute = () => {
    const next = minute + minuteStep
    if (next >= 60) emit(hour12 >= 12 ? 1 : hour12 + 1, next - 60, period)
    else emit(hour12, next, period)
  }
  const decrMinute = () => {
    const next = minute - minuteStep
    if (next < 0) emit(hour12 <= 1 ? 12 : hour12 - 1, 60 + next, period)
    else emit(hour12, next, period)
  }

  // ---- period ----
  const togglePeriod = () => emit(hour12, minute, period === "AM" ? "PM" : "AM")

  // Options
  const minuteOptions = React.useMemo(() => {
    const opts: number[] = []
    for (let m = 0; m < 60; m += minuteStep) opts.push(m)
    return opts
  }, [minuteStep])

  const hourOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  // ---- Input mode ----
  const enterInputMode = () => {
    setOpenSegment(null)
    setInputText(to12Display(hour12, minute, period))
    setInputMode(true)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }, 0)
  }

  const commitInput = () => {
    const parsed = parseTimeInput(inputText)
    if (parsed) {
      onChange?.(parsed)
    }
    setInputMode(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { commitInput() }
    if (e.key === "Escape") { setInputMode(false) }
    if (e.key === "Tab") { commitInput() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(autoFormat(e.target.value))
  }

  // ---- Segment keyboard handlers ----
  const handleHourKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp")   { e.preventDefault(); incrHour() }
    if (e.key === "ArrowDown") { e.preventDefault(); decrHour() }
    if (e.key === "Escape")    { setOpenSegment(null) }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      const buf = hourBuf + e.key
      clearTimeout(hourBufTimer.current)
      const num = parseInt(buf, 10)
      if (buf.length >= 2 || num > 1) {
        setHour(clamp(num, 1, 12)); setHourBuf("")
      } else {
        setHourBuf(buf)
        hourBufTimer.current = setTimeout(() => setHourBuf(""), 800)
      }
    }
  }

  const handleMinKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp")   { e.preventDefault(); incrMinute() }
    if (e.key === "ArrowDown") { e.preventDefault(); decrMinute() }
    if (e.key === "Escape")    { setOpenSegment(null) }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      const buf = minBuf + e.key
      clearTimeout(minBufTimer.current)
      const num = parseInt(buf, 10)
      if (buf.length >= 2 || num > 5) {
        const snapped = Math.round(num / minuteStep) * minuteStep
        setMinute(clamp(snapped, 0, 59)); setMinBuf("")
      } else {
        setMinBuf(buf)
        minBufTimer.current = setTimeout(() => setMinBuf(""), 800)
      }
    }
  }

  const handlePeriodKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); togglePeriod() }
    if (e.key.toLowerCase() === "a") emit(hour12, minute, "AM")
    if (e.key.toLowerCase() === "p") emit(hour12, minute, "PM")
    if (e.key === "Escape") setOpenSegment(null)
  }

  const handleWheel = (cb: () => void) => (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) cb()
    else {
      // down
      if (cb === incrHour) decrHour()
      else if (cb === incrMinute) decrMinute()
      else togglePeriod()
    }
  }

  const manrope = { fontFamily: "Manrope, sans-serif" }

  const segBase = cn(
    "relative flex items-center justify-center rounded-sm px-1.5 py-0.5 text-sm font-medium tabular-nums select-none cursor-pointer transition-colors outline-none h-7 min-w-[2rem]",
    "focus:bg-primary focus:text-primary-foreground",
    "hover:bg-accent",
  )
  const segActive = "bg-primary text-primary-foreground"

  const dropdownItemBase = "w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-accent cursor-pointer"
  const dropdownItemActive = "bg-primary text-primary-foreground font-medium hover:bg-primary"

  const displayHour = hour12.toString().padStart(2, "0")
  const displayMin  = minute.toString().padStart(2, "0")

  return (
    <div
      className={cn(
        "relative flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors gap-1",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {/* Clock icon — click to enter text input mode */}
      <button
        type="button"
        tabIndex={-1}
        onClick={enterInputMode}
        title="Type a time"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Clock className="h-4 w-4" />
      </button>

      {inputMode ? (
        /* ---- Typeable input ---- */
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={commitInput}
          placeholder="e.g. 2:30 PM"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          style={manrope}
        />
      ) : (
        /* ---- Segmented display ---- */
        <div className="flex items-center gap-0.5">

          {/* Hour */}
          <div ref={hourAnchorRef} className="relative">
            <div
              tabIndex={disabled ? -1 : 0}
              role="spinbutton"
              aria-label="Hour"
              aria-valuenow={hour12}
              onKeyDown={handleHourKey}
              onWheel={handleWheel(incrHour)}
              onClick={() => setOpenSegment("hour")}
              onFocus={() => setOpenSegment("hour")}
              className={cn(segBase, openSegment === "hour" && segActive)}
              style={manrope}
            >
              {displayHour}
            </div>
            <SegmentDropdown
              open={openSegment === "hour"}
              onOpenChange={(o) => setOpenSegment(o ? "hour" : null)}
              anchorRef={hourAnchorRef}
            >
              <ScrollArea className="h-44">
                <div className="py-1" style={manrope}>
                  {hourOptions.map((h) => (
                    <button
                      key={h}
                      ref={h === hour12 ? activeHourRef : undefined}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setHour(h); setOpenSegment(null) }}
                      className={cn(dropdownItemBase, h === hour12 && dropdownItemActive)}
                    >
                      {h.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SegmentDropdown>
          </div>

          <span className="text-muted-foreground font-bold select-none" style={manrope}>:</span>

          {/* Minute */}
          <div ref={minuteAnchorRef} className="relative">
            <div
              tabIndex={disabled ? -1 : 0}
              role="spinbutton"
              aria-label="Minute"
              aria-valuenow={minute}
              onKeyDown={handleMinKey}
              onWheel={handleWheel(incrMinute)}
              onClick={() => setOpenSegment("minute")}
              onFocus={() => setOpenSegment("minute")}
              className={cn(segBase, openSegment === "minute" && segActive)}
              style={manrope}
            >
              {displayMin}
            </div>
            <SegmentDropdown
              open={openSegment === "minute"}
              onOpenChange={(o) => setOpenSegment(o ? "minute" : null)}
              anchorRef={minuteAnchorRef}
            >
              <ScrollArea className="h-44">
                <div className="py-1" style={manrope}>
                  {minuteOptions.map((m) => (
                    <button
                      key={m}
                      ref={m === minute ? activeMinRef : undefined}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setMinute(m); setOpenSegment(null) }}
                      className={cn(dropdownItemBase, m === minute && dropdownItemActive)}
                    >
                      {m.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SegmentDropdown>
          </div>

          {/* AM/PM */}
          <div ref={periodAnchorRef} className="relative ml-0.5">
            <div
              tabIndex={disabled ? -1 : 0}
              role="spinbutton"
              aria-label="AM/PM"
              onKeyDown={handlePeriodKey}
              onWheel={handleWheel(togglePeriod)}
              onClick={() => setOpenSegment("period")}
              onFocus={() => setOpenSegment("period")}
              className={cn(segBase, "min-w-[2.5rem]", openSegment === "period" && segActive)}
              style={manrope}
            >
              {period}
            </div>
            <SegmentDropdown
              open={openSegment === "period"}
              onOpenChange={(o) => setOpenSegment(o ? "period" : null)}
              anchorRef={periodAnchorRef}
            >
              <div className="py-1" style={manrope}>
                {(["AM", "PM"] as const).map((p) => (
                  <button
                    key={p}
                    ref={p === period ? activePeriodRef : undefined}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); emit(hour12, minute, p); setOpenSegment(null) }}
                    className={cn(dropdownItemBase, p === period && dropdownItemActive)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </SegmentDropdown>
          </div>

          {/* Pencil / keyboard shortcut hint */}
          <button
            type="button"
            tabIndex={-1}
            onClick={enterInputMode}
            title="Type a time"
            className="ml-1 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-50 hover:opacity-100"
          >
            ✎
          </button>
        </div>
      )}
    </div>
  )
}
