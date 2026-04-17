export interface ClientCounts {
  active_count: number
  inactive_count: number
  archived_count: number
  total_count: number
}

export interface ArchivedClient {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  archived_at: string
  visits?: number
  points?: number
}

export interface TreatmentSummary {
  treatment_name: string
  total_clients: number
  total_sessions: number
  used_sessions: number
  remaining_sessions: number
  clients?: { id: string; name: string }[]
}

export interface TopStaffSales {
  staff_id: string
  staff_name: string
  total_sales: number
  completed_appointments: number
}

export type StaffSales = TopStaffSales

export interface AppointmentStats {
  total_appointments: number
  completed_appointments: number
  upcoming_appointments: number
  cancelled_appointments: number
  completion_rate: number
  avg_appointments_per_client: number
}

export interface StaffAppointments {
  staff_id: string
  staff_name: string
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  completion_rate: number
  unique_clients: number
}
