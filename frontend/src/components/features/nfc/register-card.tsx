import { useState, type FormEvent } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"
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
import { ScrollArea } from "@/components/ui/scroll-area"

import type { Customer } from "@/types/customer"

interface RegisterCardProps {
  nfcUid: string
  onSuccess: (customer: Customer) => void
  onCancel: () => void
}

export function RegisterCard({ nfcUid, onSuccess, onCancel }: RegisterCardProps) {
  const { userProfile, session } = useAuth()
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
      // 1. Create Supabase Auth User seamlessly behind the scenes if email is provided via the backend
      // so we don't accidentally log out the current staff session
      if (formData.email.trim()) {
        try {
          await apiCall("/api/accounts/create", {
            method: "POST",
            body: JSON.stringify({
              email: formData.email.trim(),
              role: "customer",
              full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`
            }),
            authToken: session?.access_token,
          })
        } catch (err) {
          console.error("Backend account creation failed (user might already exist):", err)
        }
      }

      // The Postgres Trigger `handle_new_customer_signup` will have either generated a 
      // customer record or we must link one. But since the trigger makes one for 'customer' role
      // using a dummy NFC UID, it's safer to just let the NFC Card overwrite it, or just use
      // the normal insert/upsert flow.

      // Actually, since the trigger creates a row for them automatically if they are new, 
      // let's do an UPSERT by email if they have one so we don't violate unique NFC constraints.
      
      const customerPayload = {
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
      }

      let updatedData = data
      let finalError = insertError

      // If email exists, try to upsert based on email to override what the Auth trigger generated
      if (formData.email.trim()) {
        const { data: upsertData, error: uError } = await supabase
          .from("customers")
          .upsert({ ...customerPayload, email: formData.email.trim() }, { onConflict: 'email' })
          .select()
          .single()
        
        if (!uError) {
          updatedData = upsertData
          finalError = null
        }
      } else {
        const { data: insertData, error: iError } = await supabase
          .from("customers")
          .insert(customerPayload)
          .select()
          .single()
        
        updatedData = insertData
        finalError = iError
      }


      if (finalError) {
        setError(finalError.message)
        return
      }

      // Automatically apply points for first visit
      const newCustomer = updatedData as Customer
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
        entityId: (updatedData as Customer).id,
        entityName: (updatedData as Customer).name || `${(updatedData as Customer).first_name || ""} ${(updatedData as Customer).last_name || ""}`.trim() || "Customer",
        changes: {
          before: null,
          after: {
            id: (updatedData as Customer).id,
            nfc_uid: (updatedData as Customer).nfc_uid,
            name: (updatedData as Customer).name,
            email: (updatedData as Customer).email,
            phone: (updatedData as Customer).phone,
          },
        },
        metadata: {
          source: "nfc_register_card",
        },
      })

      onSuccess(updatedData as Customer)
    } catch (err) {
      setError("Failed to register card. Please try again.")
      console.error("Registration error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col rounded-2xl bg-card shadow-2xl border max-h-[85vh] overflow-hidden">
      <RegisterCardHeader nfcUid={nfcUid} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden relative bg-card">
        {/* Subtle animated background inside the card */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-b-2xl">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary/[0.04] blur-3xl animate-[float_6s_ease-in-out_infinite]" />
          <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-primary/[0.03] blur-3xl animate-[float_9s_ease-in-out_infinite_1s]" />
        </div>

        <ScrollArea className="h-[700px] max-h-[65vh]">
          <div className="px-6 py-5 space-y-6 pb-8 relative z-10">
            <RegisterCardError error={error} />
            <RegisterCardPersonalSection formData={formData} setFormData={setFormData} />
            <RegisterCardContactSection formData={formData} setFormData={setFormData} />
            <RegisterCardMedicalSection formData={formData} setFormData={setFormData} />
          </div>
        </ScrollArea>
        
        <div className="bg-background shrink-0 border-t relative z-20 rounded-b-2xl">
          <RegisterCardFooterActions isLoading={isLoading} onCancel={onCancel} />
        </div>
      </form>
    </div>
  )
}
