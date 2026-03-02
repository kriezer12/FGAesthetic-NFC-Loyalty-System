export type RegisterCardFormData = {
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  address: string
  emergency_contact: string
  skin_type: string
  allergies: string
  notes: string
}

export const initialRegisterCardFormData: RegisterCardFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  address: "",
  emergency_contact: "",
  skin_type: "",
  allergies: "",
  notes: "",
}
