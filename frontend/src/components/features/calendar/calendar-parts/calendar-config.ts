/**
 * Calendar Configuration & Mock Data
 * ====================================
 *
 * Constants, defaults and demo data for the appointment calendar.
 * Replace mock helpers with Supabase queries when the back-end tables are ready.
 */

import type {
  Appointment,
  BlockedTime,
  ClinicHours,
  IntervalMinutes,
  StaffMember,
} from "@/types/appointment"

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Pixels rendered per calendar minute – determines vertical scale. */
export const MINUTE_HEIGHT = 2

/** Width (px) of the fixed time-label gutter on the left. */
export const TIME_GUTTER_WIDTH = 72

/** Shortest appointment allowed (minutes). */
export const MIN_APPOINTMENT_DURATION = 15

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CLINIC_HOURS: ClinicHours = { open: 9, close: 18 }
export const DEFAULT_INTERVAL: IntervalMinutes = 30

// ---------------------------------------------------------------------------
// Staff colour palette
// ---------------------------------------------------------------------------

export const STAFF_COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
] as const
