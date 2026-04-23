/**
 * Appointment & Calendar Types
 * ============================
 *
 * TypeScript interfaces for the calendar/appointment feature.
 * Used across all calendar components.
 */

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"

export interface Appointment {
  id: string
  branch_id?: string
  customer_id?: string
  customer_name?: string
  staff_id: string
  staff_name: string
  title: string
  /** IDs of selected services from the service catalog */
  service_ids?: string[]
  /** days interval for recurring appointments (if any) */
  recurrence_days?: number
  /** total number of occurrences (including first) */
  recurrence_count?: number
  /** shared ID linking all appointments in a recurring series */
  recurrence_group_id?: string
  /** optional reference to a treatment package chosen for this appointment */
  treatment_id?: string
  /** denormalized label since we don't join with customers.treatments on every query */
  treatment_name?: string
  start_time: string // ISO datetime
  end_time: string   // ISO datetime
  status: AppointmentStatus
  appointment_type?: "consultation" | "treatment" | "followup"
  location_type?: "branch" | "home_based"
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  branch_id?: string
  color: string // hex color used for appointment cards
}

export interface BlockedTime {
  id: string
  staff_id: string
  start_time: string // ISO datetime
  end_time: string   // ISO datetime
  reason: string     // e.g. "Lunch Break", "Staff Off"
}

export type IntervalMinutes = 15 | 30 | 60

export type ViewMode = "day" | "week" | "month"

export interface ClinicHours {
  open: number  // hour of day 0-23
  close: number // hour of day 0-23
}
