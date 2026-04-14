import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionHeader } from "./section-header"

import type { RegisterCardFormData } from "./register-card.types"

type RegisterCardMedicalSectionProps = {
  formData: RegisterCardFormData
  setFormData: Dispatch<SetStateAction<RegisterCardFormData>>
}

export function RegisterCardMedicalSection({ formData, setFormData }: RegisterCardMedicalSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader>Skin &amp; Medical Information</SectionHeader>

      <div
        className="rounded-xl p-5 space-y-4 bg-background border shadow-sm"   
      >
        <div className="space-y-1.5">
          <Label htmlFor="skin_type">Skin Type <span className="text-destructive">*</span></Label>
          <Select
            value={formData.skin_type}
            onValueChange={(value) => setFormData({ ...formData, skin_type: value })}
            required
          >
            <SelectTrigger id="skin_type">
              <SelectValue placeholder="Select skin type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="dry">Dry</SelectItem>
              <SelectItem value="oily">Oily</SelectItem>
              <SelectItem value="combination">Combination</SelectItem>
              <SelectItem value="sensitive">Sensitive</SelectItem>
            </SelectContent>
          </Select>
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
          <Textarea
            id="notes"
            className="min-h-[80px] resize-none"
            placeholder="Any other relevant information..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
