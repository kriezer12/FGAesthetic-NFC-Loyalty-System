import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { NFCScanner, RegisterCard } from "@/components/features/nfc"
import { supabase } from "@/lib/supabase"
import { applyAutomatedPoints } from "@/lib/loyalty-utils"

import type { Customer } from "@/types/customer"

type ViewState = "scanning" | "register"

export default function NFCScanPage() {
  const navigate = useNavigate()
  const [viewState, setViewState] = useState<ViewState>("scanning")
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null)
  const location = useLocation()

  const handleCustomerFound = async (customer: Customer) => {
    // 1. Automatically apply points for this visit
    const result = await applyAutomatedPoints(customer.id)
    
    // 2. Fetch updated customer data after point addition
    const { data: updatedCustomer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customer.id)
      .single()

    // 3. navigate to the customers list and open the details modal
    navigate("/dashboard/customers", { 
      state: { 
        customer: updatedCustomer || customer, 
        fromNfc: true,
        pointsAdded: result.success ? result.pointsAdded : null
      } 
    })
  }

  const handleNewCard = (nfcUid: string) => {
    setPendingNfcUid(nfcUid)
    setViewState("register")
  }

  const handleRegistrationSuccess = (customer: Customer) => {
    // after creating a new card, jump to customer modal as well
    setPendingNfcUid(null)
    setViewState("scanning")
    navigate("/dashboard/customers", { state: { customer, fromNfc: true } })
  }

  const handleClose = () => {
    setPendingNfcUid(null)
    setViewState("scanning")
  }

  // no longer track customer locally; navigation handles viewing/updating

  useEffect(() => {
    document.title = "NFC Scanner - FG Aesthetic Centre"
  }, [])

  // if the listener navigated here with a uid, process it immediately
  useEffect(() => {
    const uid = (location.state as any)?.uid
    if (!uid) return

    // mimic what NFCScanner does when it reads a card
    async function check() {
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("nfc_uid", uid)
        .single()

      if (customer) {
        handleCustomerFound(customer)
      } else {
        handleNewCard(uid)
      }
    }

    check()
    // clear the state so re-visiting the page doesn't re-trigger
    window.history.replaceState({}, "", window.location.pathname)
  }, [location.state])

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
            {viewState === "scanning" && (
              <NFCScanner onCustomerFound={handleCustomerFound} onNewCard={handleNewCard} />
            )}

            {viewState === "register" && pendingNfcUid && (
              <RegisterCard nfcUid={pendingNfcUid} onSuccess={handleRegistrationSuccess} onCancel={handleClose} />
            )}
    </div>
  )
}
