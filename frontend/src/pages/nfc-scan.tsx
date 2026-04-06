import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { NFCScanner, RegisterCard } from "@/components/features/nfc"
import { supabase } from "@/lib/supabase"
import { applyAutomatedPoints } from "@/lib/loyalty-utils"

import type { Customer } from "@/types/customer"

type ViewState = "scanning" | "register"

export default function NFCScanPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [viewState, setViewState] = useState<ViewState>("scanning")
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const location = useLocation()

  const handleCustomerFound = async (customer: Customer) => {
    if (isRegisterMode) {
      // In register mode we want an unassigned card. Ask user to retry.
      setRegisterError(
        `Card already assigned to ${
          customer.name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "another customer"
        }. Please scan an unassigned card.`
      )
      return
    }

    // 1. Automatically apply points for this visit
    let branchId = userProfile?.branch_id
    if (userProfile?.role === "super_admin") {
      const savedBranch = sessionStorage.getItem("superadmin_branch")
      if (savedBranch && savedBranch !== "NA") {
        branchId = savedBranch
      } else {
        branchId = undefined
      }
    }
    const processedBy = userProfile?.id || undefined

    const result = await applyAutomatedPoints(customer.id, undefined, branchId, processedBy)

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
    setRegisterError(null)
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

  useEffect(() => {
    document.title = "NFC Scanner - FG Aesthetic Centre"

    const mode = (location.state as any)?.mode
    setIsRegisterMode(mode === "register")
  }, [location.state])

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
    <div className="relative flex min-h-[calc(100vh-10rem)] items-center justify-center px-4">
      {/* Subtle radial gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute left-1/3 bottom-1/4 h-[300px] w-[300px] rounded-full bg-primary/[0.02] blur-3xl" />
      </div>

      <div className="relative z-10 w-full">
        {viewState === "scanning" && (
          <>
            {registerError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {registerError}
              </div>
            )}
            <NFCScanner
              onCustomerFound={handleCustomerFound}
              onNewCard={handleNewCard}
              mode={isRegisterMode ? "register" : "scan"}
            />
          </>
        )}

        {viewState === "register" && pendingNfcUid && (
          <RegisterCard nfcUid={pendingNfcUid} onSuccess={handleRegistrationSuccess} onCancel={handleClose} />
        )}
      </div>
    </div>
  )
}
