export interface Customer {
  id: string
  nfc_uid: string

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
}

export interface CheckinLog {
  id: string
  customer_id: string
  checked_in_at: string
  points_added: number
}
