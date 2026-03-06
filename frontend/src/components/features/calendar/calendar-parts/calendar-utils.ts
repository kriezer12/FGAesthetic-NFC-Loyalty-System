/**
 * Calendar Utility Functions
 * ==========================
 *
 * Pure helpers for snapping, positioning, time formatting, overlap detection,
 * and working-hours validation used by the calendar grid and dialog.
 */

import type {
  Appointment,
  BlockedTime,
  ClinicHours,
  IntervalMinutes,
} from "@/types/appointment"
import { MINUTE_HEIGHT } from "./calendar-config"

// ---------------------------------------------------------------------------
// Snapping
// ---------------------------------------------------------------------------

/** Round `minutes` to the nearest interval boundary. */
export function snapToInterval(minutes: number, interval: IntervalMinutes): number {
  return Math.round(minutes / interval) * interval
}

/** Floor `minutes` to the previous interval boundary. */
export function snapFloorToInterval(minutes: number, interval: IntervalMinutes): number {
  return Math.floor(minutes / interval) * interval
}

// ---------------------------------------------------------------------------
// Time ↔ pixel conversions
// ---------------------------------------------------------------------------

/** Total minutes elapsed since midnight for a Date or ISO string. */
export function minutesSinceMidnight(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date
  return d.getHours() * 60 + d.getMinutes()
}

/** Pixel offset from the top of the grid for a given time. */
export function getTopFromTime(date: Date | string, clinicOpenHour: number): number {
  const mins = minutesSinceMidnight(date)
  return (mins - clinicOpenHour * 60) * MINUTE_HEIGHT
}

/** Pixel height for the duration between two ISO times. */
export function getHeightFromDuration(startTime: string, endTime: string): number {
  return (minutesSinceMidnight(endTime) - minutesSinceMidnight(startTime)) * MINUTE_HEIGHT
}

// ---------------------------------------------------------------------------
// Time-slot generation
// ---------------------------------------------------------------------------

/** Array of minute-of-day values for every slot between open and close. */
export function generateTimeSlots(
  clinicHours: ClinicHours,
  interval: IntervalMinutes,
): number[] {
  const slots: number[] = []
  const start = clinicHours.open * 60
  const end = clinicHours.close * 60
  for (let m = start; m < end; m += interval) slots.push(m)
  return slots
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "9:00 AM" style label from total minutes since midnight. */
export function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const period = h >= 12 ? "PM" : "AM"
  const display = h % 12 || 12
  return `${display}:${m.toString().padStart(2, "0")} ${period}`
}

/** Total minutes → "HH:MM" for <input type="time">. */
export function minutesToTimeInput(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

/** ISO datetime string → "HH:MM" for <input type="time">. */
export function isoToTimeInput(iso: string): string {
  const d = new Date(iso)
  return minutesToTimeInput(d.getHours() * 60 + d.getMinutes())
}

/** "HH:MM" input value → total minutes since midnight. */
export function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number)
  return h * 60 + (m || 0)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** True when the time range fits inside clinic operating hours. */
export function isWithinWorkingHours(
  startMinutes: number,
  endMinutes: number,
  clinicHours: ClinicHours,
): boolean {
  return startMinutes >= clinicHours.open * 60 && endMinutes <= clinicHours.close * 60
}

/** True when the proposed range overlaps any existing appointment for that staff on the given date. */
export function hasOverlap(
  excludeId: string,
  staffId: string,
  startMinutes: number,
  endMinutes: number,
  appointmentDate: Date,
  appointments: Appointment[],
): boolean {
  return appointments.some((a) => {
    if (a.id === excludeId || a.staff_id !== staffId) return false
    if (a.status === "cancelled") return false
    // Must be on the same day
    if (!isSameDay(new Date(a.start_time), appointmentDate)) return false
    const aStart = minutesSinceMidnight(a.start_time)
    const aEnd = minutesSinceMidnight(a.end_time)
    return startMinutes < aEnd && endMinutes > aStart
  })
}

/** True when the proposed range overlaps any blocked time for that staff on the given date. */
export function hasBlockedTimeConflict(
  staffId: string,
  startMinutes: number,
  endMinutes: number,
  blockDate: Date,
  blockedTimes: BlockedTime[],
): boolean {
  return blockedTimes.some((b) => {
    if (b.staff_id !== staffId) return false
    // Must be on the same day
    if (!isSameDay(new Date(b.start_time), blockDate)) return false
    const bStart = minutesSinceMidnight(b.start_time)
    const bEnd = minutesSinceMidnight(b.end_time)
    return startMinutes < bEnd && endMinutes > bStart
  })
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Return a new Date with the time portion set to `totalMinutes` since midnight. */
export function setTimeOnDate(date: Date, totalMinutes: number): Date {
  const d = new Date(date)
  d.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0)
  return d
}

/** Shallow same-calendar-day check. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Simple unique-enough ID generator for client-side use. */
export function generateId(): string {
  return `apt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
