import { useState, type FormEvent } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { applyAutomatedPoints } from "@/lib/loyalty-utils"
import { validatePhilippinePhone } from "./register-card-parts/phone-utils"
import { RegisterCardContactSection } from "./register-card-parts/register-card-contact-section"
import { RegisterCardError } from "./register-card-parts/register-card-error"
import { RegisterCardFooterActions } from "./register-card-parts/register-card-footer-actions"
import { RegisterCardHeader } from "./register-card-parts/register-card-header"
import { RegisterCardMedicalSection } from "./register-card-parts/register-card-medical-section"
import { RegisterCardPersonalSection } from "./register-card-parts/register-card-personal-section"
import { initialRegisterCardFormData } from "./register-card-parts/register-card.types"
import { logUserAction } from "@/lib/user-log"

import type { Customer } from "@/types/customer"

interface RegisterCardProps {
  nfcUid: string
  onSuccess: (customer: Customer) => void
  onCancel: () => void
}

export function RegisterCard({ nfcUid, onSuccess, onCancel }: RegisterCardProps) {
  const { userProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialRegisterCardFormData)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validate required fields
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError("First and last name are required")
      return
    }

    if (!formData.email.trim()) {
      setError("Email is required")
      return
    }

    if (!formData.date_of_birth.trim()) {
      setError("Date of birth is required")
      return
    }

    if (!formData.gender.trim()) {
      setError("Gender is required")
      return
    }

    if (!formData.address.trim()) {
      setError("Address is required")
      return
    }

    if (!formData.skin_type.trim()) {
      setError("Skin type is required")
      return
    }

    const phoneValidation = validatePhilippinePhone(formData.phone)
    if (phoneValidation) {
      setError(phoneValidation)
      return
    }

    const emergencyPhoneValidation = formData.emergency_contact_phone.trim() 
      ? validatePhilippinePhone(formData.emergency_contact_phone)
      : null
    if (emergencyPhoneValidation) {
      setError(emergencyPhoneValidation)
      return
    }

    setIsLoading(true)

    try {
      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({
          nfc_uid: nfcUid,
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_initial.trim() || null,
          last_name: formData.last_name.trim(),
          name: `${formData.first_name.trim()}${formData.middle_initial.trim() ? ' ' + formData.middle_initial.trim() : ''} ${formData.last_name.trim()}`,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          address: formData.address.trim(),
          emergency_contact: `${formData.emergency_contact_name.trim()} / ${formData.emergency_contact_phone.trim()}`,
          skin_type: formData.skin_type,
          allergies: formData.allergies.trim() || null,
          notes: formData.notes.trim() || null,
          points: 0,
          visits: 1,
          last_visit: new Date().toISOString(),
          archived_at: null, // default active
          last_inactive: null,
          branch_id: userProfile?.branch_id || null, // Add branch from logged-in user
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Automatically apply points for first visit
      const newCustomer = data as Customer
      await applyAutomatedPoints(newCustomer.id)
      
      // Fetch updated customer data
      const { data: updatedCustomer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", newCustomer.id)
        .single()

      onSuccess((updatedCustomer as Customer) || newCustomer)
      await logUserAction({
        actionType: "registered_new_client",
        entityType: "customer",
        entityId: (data as Customer).id,
        entityName: (data as Customer).name || `${(data as Customer).first_name || ""} ${(data as Customer).last_name || ""}`.trim() || "Customer",
        changes: {
          before: null,
          after: {
            id: (data as Customer).id,
            nfc_uid: (data as Customer).nfc_uid,
            name: (data as Customer).name,
            email: (data as Customer).email,
            phone: (data as Customer).phone,
          },
        },
        metadata: {
          source: "nfc_register_card",
        },
      })

      onSuccess(data as Customer)
    } catch (err) {
      setError("Failed to register card. Please try again.")
      console.error("Registration error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col bg-card text-card-foreground rounded-xl border shadow-sm" style={{ maxHeight: "85vh" }}>
      <RegisterCardHeader nfcUid={nfcUid} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <RegisterCardError error={error} />
          <RegisterCardPersonalSection formData={formData} setFormData={setFormData} />
          <RegisterCardContactSection formData={formData} setFormData={setFormData} />
          <RegisterCardMedicalSection formData={formData} setFormData={setFormData} />
        </div>
        <RegisterCardFooterActions isLoading={isLoading} onCancel={onCancel} />
      </form>
    </div>
  )
}
