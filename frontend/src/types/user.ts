export type UserRole = "super_admin" | "branch_admin" | "staff"

export interface UserProfileType {
  id: string
  email: string
  name?: string
  role: UserRole
  branch?: string
  created_at?: string
  updated_at?: string
}

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: UserRole
  branch?: string
}
