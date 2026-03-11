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
}
