import { useState, type FormEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { RegisterCardContactSection } from "./register-card-parts/register-card-contact-section"
import { RegisterCardError } from "./register-card-parts/register-card-error"
import { RegisterCardFooterActions } from "./register-card-parts/register-card-footer-actions"
import { RegisterCardHeader } from "./register-card-parts/register-card-header"
import { RegisterCardMedicalSection } from "./register-card-parts/register-card-medical-section"
import { RegisterCardPersonalSection } from "./register-card-parts/register-card-personal-section"
import { initialRegisterCardFormData } from "./register-card-parts/register-card.types"

import type { Customer } from "@/types/customer"

interface RegisterCardProps {
  nfcUid: string
  onSuccess: (customer: Customer) => void
  onCancel: () => void
}

export function RegisterCard({ nfcUid, onSuccess, onCancel }: RegisterCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialRegisterCardFormData)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError("First and last name are required")
      return
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required")
      return
    }

    setIsLoading(true)

    try {
      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({
          nfc_uid: nfcUid,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
          email: formData.email.trim() || null,
          phone: formData.phone.trim(),
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          address: formData.address.trim() || null,
          emergency_contact: formData.emergency_contact.trim() || null,
          skin_type: formData.skin_type || null,
          allergies: formData.allergies.trim() || null,
          notes: formData.notes.trim() || null,
          points: 0,
          visits: 1,
          last_visit: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      onSuccess(data as Customer)
    } catch (err) {
      setError("Failed to register card. Please try again.")
      console.error("Registration error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto max-h-[85vh] overflow-y-auto">
      <RegisterCardHeader nfcUid={nfcUid} />
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <RegisterCardError error={error} />
          <RegisterCardPersonalSection formData={formData} setFormData={setFormData} />
          <RegisterCardContactSection formData={formData} setFormData={setFormData} />
          <RegisterCardMedicalSection formData={formData} setFormData={setFormData} />
        </CardContent>
        <RegisterCardFooterActions isLoading={isLoading} onCancel={onCancel} />
      </form>
    </Card>
  )
}
