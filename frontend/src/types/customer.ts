export interface Customer {
  id: string
  nfc_uid: string

  points: number
  visits: number

  first_name?: string
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
}

export interface CheckinLog {
  id: string
  customer_id: string
  checked_in_at: string
  points_added: number
}
