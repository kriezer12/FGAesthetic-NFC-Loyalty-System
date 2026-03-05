import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { NFCScanner, RegisterCard } from "@/components/features/nfc"
import { CustomerInfo } from "@/components/features/customers"
import { supabase } from "@/lib/supabase"

import type { Customer } from "@/types/customer"

type ViewState = "scanning" | "customer" | "register"

export default function NFCScanPage() {
  const [viewState, setViewState] = useState<ViewState>("scanning")
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null)
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null)
  const location = useLocation()

  const handleCustomerFound = (customer: Customer) => {
    setCurrentCustomer(customer)
    setViewState("customer")
  }

  const handleNewCard = (nfcUid: string) => {
    setPendingNfcUid(nfcUid)
    setViewState("register")
  }

  const handleRegistrationSuccess = (customer: Customer) => {
    setCurrentCustomer(customer)
    setPendingNfcUid(null)
    setViewState("customer")
  }

  const handleClose = () => {
    setCurrentCustomer(null)
    setPendingNfcUid(null)
    setViewState("scanning")
  }

  const handleCustomerUpdate = (updatedCustomer: Customer) => {
    setCurrentCustomer(updatedCustomer)
  }

  useEffect(() => {
    document.title = "NFC Scanner - FG Aesthetic Centre"
  }, [])

  // if the listener navigated here with a uid, process it immediately
  useEffect(() => {
    const uid = (location.state as any)?.uid
    if (!uid) return

    // mimic what NFCScanner does when it reads a card
    async function check() {
      const { data: customer, error } = await supabase
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

            {viewState === "customer" && currentCustomer && (
              <CustomerInfo customer={currentCustomer} onClose={handleClose} onUpdate={handleCustomerUpdate} />
            )}

            {viewState === "register" && pendingNfcUid && (
              <RegisterCard nfcUid={pendingNfcUid} onSuccess={handleRegistrationSuccess} onCancel={handleClose} />
            )}
    </div>
  )
}
