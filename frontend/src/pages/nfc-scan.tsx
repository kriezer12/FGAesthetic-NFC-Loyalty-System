import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NFCScanner } from "@/components/nfc-scanner"
import { CustomerInfo } from "@/components/customer-info"
import { RegisterCard } from "@/components/register-card"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>NFC Scanner</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-6">
          <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
            {viewState === "scanning" && (
              <NFCScanner onCustomerFound={handleCustomerFound} onNewCard={handleNewCard} />
            )}

            {viewState === "customer" && currentCustomer && (
              <CustomerInfo 
                customer={currentCustomer} 
                onClose={handleClose} 
                onUpdate={handleCustomerUpdate}
              />
            )}

            {viewState === "register" && pendingNfcUid && (
              <RegisterCard nfcUid={pendingNfcUid} onSuccess={handleRegistrationSuccess} onCancel={handleClose} />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
