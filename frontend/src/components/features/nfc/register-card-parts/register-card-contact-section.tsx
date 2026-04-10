import { useState, type Dispatch, type SetStateAction, type KeyboardEvent } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionHeader } from "./section-header"
import { formatPhilippinePhone, formatPhoneLiveInput, validatePhilippinePhone, isAllowedPhoneKey } from "./phone-utils"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardContactSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

export function RegisterCardContactSection({ formData, setFormData }: RegisterCardContactSectionProps) {
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string | null>(null)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneLiveInput(e.target.value)
    setFormData({ ...formData, phone: formatted })
    // Clear error while typing so it doesn't annoy mid-entry
    if (phoneError) setPhoneError(null)
  }

  const handlePhoneBlur = () => {
    const formatted = formatPhilippinePhone(formData.phone)
    const updated = { ...formData, phone: formatted }
    setFormData(updated)
    setPhoneError(validatePhilippinePhone(formatted))
  }

  const handlePhoneKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isAllowedPhoneKey(e.key)) {
      e.preventDefault()
    }
  }

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneLiveInput(e.target.value)
    setFormData({ ...formData, emergency_contact_phone: formatted })
    // Clear error while typing so it doesn't annoy mid-entry
    if (emergencyPhoneError) setEmergencyPhoneError(null)
  }

  const handleEmergencyPhoneBlur = () => {
    if (formData.emergency_contact_phone.trim()) {
      const formatted = formatPhilippinePhone(formData.emergency_contact_phone)
      const updated = { ...formData, emergency_contact_phone: formatted }
      setFormData(updated)
      setEmergencyPhoneError(validatePhilippinePhone(formatted))
    } else {
      setEmergencyPhoneError(null)
    }
  }

  const handleEmergencyPhoneKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isAllowedPhoneKey(e.key)) {
      e.preventDefault()
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader>Contact Information</SectionHeader>

      <div
        className="rounded-lg p-4 space-y-4"
        style={{ background: "oklch(0.96 0.01 78 / 40%)", border: "1px solid oklch(0.88 0.06 78 / 20%)" }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+63 9XX XXX XXXX or 09XX XXX XXXX"
              value={formData.phone}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              onKeyDown={handlePhoneKeyDown}
              className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
              required
            />
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="client@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
          <Input
            id="address"
            placeholder="Complete address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
            <Input
              id="emergency_contact_name"
              placeholder="Contact name"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              placeholder="+63 9XX XXX XXXX or 09XX XXX XXXX"
              value={formData.emergency_contact_phone}
              onChange={handleEmergencyPhoneChange}
              onBlur={handleEmergencyPhoneBlur}
              onKeyDown={handleEmergencyPhoneKeyDown}
              className={emergencyPhoneError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {emergencyPhoneError && (
              <p className="text-xs text-destructive">{emergencyPhoneError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
