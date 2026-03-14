export type RegisterCardFormData = {
  first_name: string
  middle_initial: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  skin_type: string
  allergies: string
  notes: string
}

export const initialRegisterCardFormData: RegisterCardFormData = {
  first_name: "",
  middle_initial: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  skin_type: "",
  allergies: "",
  notes: "",
}
