export interface Customer {
  id: string
  nfc_uid?: string | null

  points: number
  visits: number

  first_name?: string
  middle_name?: string
  last_name?: string
  name?: string
  email?: string
  phone?: string

  date_of_birth?: string
  gender?: string
  address?: string
  emergency_contact?: string

  skin_type?: string
  allergies?: string
  notes?: string

  created_at?: string
  last_visit?: string

  // soft-delete timestamp; null when active/non-archived
  archived_at?: string
  // optional timestamp when client was first marked inactive (threshold pass)
  last_inactive?: string

  // treatment progress array. stored as JSON in the customers row for
  // simplicity. see roadmap/client_treatments for a more normalized
  // eventual design.
  treatments?: Treatment[]

  // Branch information
  branch_id?: string
  branch_name?: string
}

export interface CheckinLog {
  id: string
  customer_id: string
  checked_in_at: string
  points_added: number
}

// ---- treatment-related types ------------------------------------------------

export interface Treatment {
  id: string
  name: string
  total_sessions: number
  used_sessions: number
  remaining_sessions: number
}

// Logged payload for any time a customer treatment record is modified.
// Several operations may trigger this:
//  * remaining_sessions changed
//  * new package added or removed
//  * status reason updated (e.g. completed)
export interface TreatmentLog {
  id: string
  customer_id: string
  changes: Record<string, any>
  created_at: string
}
