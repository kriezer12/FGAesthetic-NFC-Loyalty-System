import { useState, useEffect } from "react"
import { NFCScanner, RegisterCard } from "@/components/features/nfc"
import { CustomerInfo } from "@/components/features/customers"

import type { Customer } from "@/types/customer"

type ViewState = "scanning" | "customer" | "register"

export default function NFCScanPage() {
  const [viewState, setViewState] = useState<ViewState>("scanning")
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null)
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null)

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
