import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionHeader } from "./section-header"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardMedicalSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

const selectClassName = [
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
  "shadow-sm transition-colors text-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

const textareaClassName = [
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "shadow-sm text-foreground placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "resize-none disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

export function RegisterCardMedicalSection({ formData, setFormData }: RegisterCardMedicalSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader>Skin &amp; Medical Information</SectionHeader>

      <div
        className="rounded-lg p-4 space-y-4"
        style={{ background: "oklch(0.96 0.01 78 / 40%)", border: "1px solid oklch(0.88 0.06 78 / 20%)" }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="skin_type">Skin Type <span className="text-destructive">*</span></Label>
          <select
            id="skin_type"
            className={selectClassName}
            value={formData.skin_type}
            onChange={(e) => setFormData({ ...formData, skin_type: e.target.value })}
            required
          >
            <option value="">Select skin type</option>
            <option value="normal">Normal</option>
            <option value="dry">Dry</option>
            <option value="oily">Oily</option>
            <option value="combination">Combination</option>
            <option value="sensitive">Sensitive</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="allergies">Known Allergies</Label>
          <Input
            id="allergies"
            placeholder="List any known allergies (medications, products, etc.)"
            value={formData.allergies}
            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea
            id="notes"
            className={textareaClassName}
            placeholder="Any other relevant information..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
