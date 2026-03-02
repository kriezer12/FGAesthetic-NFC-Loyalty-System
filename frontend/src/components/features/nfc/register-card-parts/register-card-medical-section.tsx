import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardMedicalSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
const textareaClassName = "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

export function RegisterCardMedicalSection({ formData, setFormData }: RegisterCardMedicalSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Skin & Medical Information</h3>

      <div className="space-y-2">
        <Label htmlFor="skin_type">Skin Type</Label>
        <select
          id="skin_type"
          className={selectClassName}
          value={formData.skin_type}
          onChange={(event) => setFormData({ ...formData, skin_type: event.target.value })}
        >
          <option value="">Select skin type</option>
          <option value="normal">Normal</option>
          <option value="dry">Dry</option>
          <option value="oily">Oily</option>
          <option value="combination">Combination</option>
          <option value="sensitive">Sensitive</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergies">Known Allergies</Label>
        <Input
          id="allergies"
          placeholder="List any known allergies (medications, products, etc.)"
          value={formData.allergies}
          onChange={(event) => setFormData({ ...formData, allergies: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <textarea
          id="notes"
          className={textareaClassName}
          placeholder="Any other relevant information..."
          value={formData.notes}
          onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
        />
      </div>
    </div>
  )
}
