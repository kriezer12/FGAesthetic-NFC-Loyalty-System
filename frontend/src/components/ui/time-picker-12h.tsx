/**
 * Time Picker (12-Hour Format)
 * ============================
 *
 * A custom time picker component that uses 12-hour format with AM/PM selector.
 * Converts to/from 24-hour format (HH:MM) for storage.
 */

import { useState, useEffect } from "react"

interface TimePickerProps {
  value: string // HH:MM format (24-hour)
  onChange: (value: string) => void
  label?: string
  color?: "primary" | "accent" | "secondary"
}

/**
 * Convert 24-hour format (HH:MM) to 12-hour format
 * Returns { hour: 1-12, minute: 0-59, ampm: "AM" | "PM" }
 */
function parseTime24To12(time24: string): { hour: number; minute: number; ampm: "AM" | "PM" } {
  const [hoursStr, minutesStr] = time24.split(":")
  let hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)

  const ampm = hours >= 12 ? "PM" : "AM"
  if (hours === 0) {
    hours = 12
  } else if (hours > 12) {
    hours -= 12
  }

  return { hour: hours, minute: minutes, ampm }
}

/**
 * Convert 12-hour format to 24-hour format (HH:MM)
 */
function parseTime12To24(hour: number, minute: number, ampm: "AM" | "PM"): string {
  let hours24 = hour
  if (ampm === "PM" && hours24 !== 12) {
    hours24 += 12
  } else if (ampm === "AM" && hours24 === 12) {
    hours24 = 0
  }

  const hoursStr = String(hours24).padStart(2, "0")
  const minutesStr = String(minute).padStart(2, "0")
  return `${hoursStr}:${minutesStr}`
}

export function TimePicker12Hour({ value, onChange, label, color = "primary" }: TimePickerProps) {
  const [time, setTime] = useState(() => parseTime24To12(value))

  useEffect(() => {
    setTime(parseTime24To12(value))
  }, [value])

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = parseInt(e.target.value, 10)
    const newTime = { ...time, hour: newHour }
    setTime(newTime)
    onChange(parseTime12To24(newTime.hour, newTime.minute, newTime.ampm))
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = parseInt(e.target.value, 10)
    const newTime = { ...time, minute: newMinute }
    setTime(newTime)
    onChange(parseTime12To24(newTime.hour, newTime.minute, newTime.ampm))
  }

  const handleAmPmChange = (newAmPm: "AM" | "PM") => {
    const newTime = { ...time, ampm: newAmPm }
    setTime(newTime)
    onChange(parseTime12To24(time.hour, time.minute, newAmPm))
  }

  const borderClass = {
    primary: "border-primary/30 hover:border-primary/50 focus-within:border-primary/60",
    accent: "border-accent/30 hover:border-accent/50 focus-within:border-accent/60",
    secondary: "border-secondary/30 hover:border-secondary/50 focus-within:border-secondary/60",
  }[color]

  const bgClass = {
    primary: "bg-primary/10 focus-within:bg-primary/15",
    accent: "bg-accent/10 focus-within:bg-accent/15",
    secondary: "bg-secondary/10 focus-within:bg-secondary/15",
  }[color]

  const selectBgClass = {
    primary: "border-primary/20 focus:border-primary/50",
    accent: "border-accent/20 focus:border-accent/50",
    secondary: "border-secondary/20 focus:border-secondary/50",
  }[color]

  const buttonBgClass = {
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground",
  }[color]

  return (
    <div>
      {label && <label className="text-sm font-medium block mb-2">{label}</label>}
      <div className={`flex items-center gap-2 p-3 border-2 rounded-lg ${bgClass} ${borderClass} transition-colors`}>
        {/* Hour Selector */}
        <select
          value={time.hour}
          onChange={handleHourChange}
          className={`flex-1 px-2 py-1.5 border rounded bg-background text-sm font-semibold focus:outline-none transition-colors ${selectBgClass}`}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>

        <span className="text-sm font-semibold text-muted-foreground">:</span>

        {/* Minute Selector */}
        <select
          value={time.minute}
          onChange={handleMinuteChange}
          className={`flex-1 px-2 py-1.5 border rounded bg-background text-sm font-semibold focus:outline-none transition-colors ${selectBgClass}`}
        >
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>

        {/* AM/PM Selector */}
        <div className="flex gap-1 ml-1 bg-muted p-1 rounded">
          {(["AM", "PM"] as const).map((ampm) => (
            <button
              key={ampm}
              onClick={() => handleAmPmChange(ampm)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                time.ampm === ampm
                  ? `${buttonBgClass}`
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {ampm}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
