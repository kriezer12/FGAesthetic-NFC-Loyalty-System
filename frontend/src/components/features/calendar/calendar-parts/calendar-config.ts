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

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

function todayAt(hour: number, minute = 0): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const MOCK_STAFF: StaffMember[] = [
  { id: "staff-1", name: "Sarah Kim",    role: "Lead Aesthetician",   color: "#8b5cf6" },
  { id: "staff-2", name: "Maria Santos", role: "Senior Aesthetician", color: "#3b82f6" },
  { id: "staff-3", name: "James Lee",    role: "Aesthetician",        color: "#10b981" },
]

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-1", staff_id: "staff-1", staff_name: "Sarah Kim",
    customer_name: "Emily Chen", title: "Facial Treatment",
    start_time: todayAt(9, 0), end_time: todayAt(10, 0),
    status: "confirmed",
  },
  {
    id: "apt-2", staff_id: "staff-1", staff_name: "Sarah Kim",
    customer_name: "John Park", title: "Botox Consultation",
    start_time: todayAt(10, 30), end_time: todayAt(11, 30),
    status: "scheduled",
  },
  {
    id: "apt-3", staff_id: "staff-1", staff_name: "Sarah Kim",
    customer_name: "Lisa Wong", title: "Chemical Peel",
    start_time: todayAt(14, 0), end_time: todayAt(15, 0),
    status: "scheduled",
  },
  {
    id: "apt-4", staff_id: "staff-2", staff_name: "Maria Santos",
    customer_name: "David Lee", title: "Laser Treatment",
    start_time: todayAt(9, 30), end_time: todayAt(10, 30),
    status: "confirmed",
  },
  {
    id: "apt-5", staff_id: "staff-2", staff_name: "Maria Santos",
    customer_name: "Anna Smith", title: "Microneedling",
    start_time: todayAt(11, 0), end_time: todayAt(12, 0),
    status: "scheduled",
  },
  {
    id: "apt-6", staff_id: "staff-2", staff_name: "Maria Santos",
    customer_name: "Tom Brown", title: "HydraFacial",
    start_time: todayAt(14, 30), end_time: todayAt(15, 30),
    status: "confirmed",
  },
  {
    id: "apt-7", staff_id: "staff-3", staff_name: "James Lee",
    customer_name: "Grace Kim", title: "Skin Consultation",
    start_time: todayAt(10, 0), end_time: todayAt(11, 0),
    status: "scheduled",
  },
  {
    id: "apt-8", staff_id: "staff-3", staff_name: "James Lee",
    customer_name: "Mike Johnson", title: "LED Light Therapy",
    start_time: todayAt(13, 0), end_time: todayAt(14, 0),
    status: "confirmed",
  },
]

export const MOCK_BLOCKED_TIMES: BlockedTime[] = [
  { id: "block-1", staff_id: "staff-1", start_time: todayAt(12, 0), end_time: todayAt(13, 0), reason: "Lunch Break" },
  { id: "block-2", staff_id: "staff-2", start_time: todayAt(12, 0), end_time: todayAt(13, 0), reason: "Lunch Break" },
  { id: "block-3", staff_id: "staff-3", start_time: todayAt(12, 0), end_time: todayAt(13, 0), reason: "Lunch Break" },
]
