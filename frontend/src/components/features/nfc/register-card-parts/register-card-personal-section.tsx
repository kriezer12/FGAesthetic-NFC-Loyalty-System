import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionHeader } from "./section-header"
import { DatePicker } from "./date-picker"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardPersonalSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

export function RegisterCardPersonalSection({ formData, setFormData }: RegisterCardPersonalSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader>Personal Information</SectionHeader>

      <div
        className="rounded-xl p-5 space-y-4 bg-background border shadow-sm"
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
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
              required
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>      
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
