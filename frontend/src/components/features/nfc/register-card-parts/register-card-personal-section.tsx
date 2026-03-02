import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardPersonalSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

export function RegisterCardPersonalSection({ formData, setFormData }: RegisterCardPersonalSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Personal Information</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            placeholder="First name"
            value={formData.first_name}
            onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            placeholder="Last name"
            value={formData.last_name}
            onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(event) => setFormData({ ...formData, date_of_birth: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            className={selectClassName}
            value={formData.gender}
            onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
          >
            <option value="">Select gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>
    </div>
  )
}
