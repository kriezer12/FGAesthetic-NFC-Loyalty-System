import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionHeader } from "./section-header"
import { DatePicker } from "./date-picker"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardPersonalSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

const selectClassName = [
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
  "shadow-sm transition-colors text-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

export function RegisterCardPersonalSection({ formData, setFormData }: RegisterCardPersonalSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader>Personal Information</SectionHeader>

      <div
        className="rounded-lg p-4 space-y-4"
        style={{ background: "oklch(0.96 0.01 78 / 40%)", border: "1px solid oklch(0.88 0.06 78 / 20%)" }}
      >
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="first_name">First Name <span className="text-destructive">*</span></Label>
            <Input
              id="first_name"
              placeholder="First name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middle_initial">Middle Name</Label>
            <Input
              id="middle_initial"
              placeholder="Middle name"
              value={formData.middle_initial}
              onChange={(e) => setFormData({ ...formData, middle_initial: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="last_name">Last Name <span className="text-destructive">*</span></Label>
            <Input
              id="last_name"
              placeholder="Last name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            id="date_of_birth"
            label="Date of Birth"
            value={formData.date_of_birth}
            onChange={(date) => setFormData({ ...formData, date_of_birth: date })}
            required
          />
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
            <select
              id="gender"
              className={selectClassName}
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              required
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
    </div>
  )
}
