import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardContactSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

export function RegisterCardContactSection({ formData, setFormData }: RegisterCardContactSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            value={formData.phone}
            onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="client@email.com"
            value={formData.email}
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          placeholder="Complete address"
          value={formData.address}
          onChange={(event) => setFormData({ ...formData, address: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact">Emergency Contact</Label>
        <Input
          id="emergency_contact"
          placeholder="Name and phone number"
          value={formData.emergency_contact}
          onChange={(event) => setFormData({ ...formData, emergency_contact: event.target.value })}
        />
      </div>
    </div>
  )
}
