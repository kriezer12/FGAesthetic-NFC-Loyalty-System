import * as React from "react"
import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NFCScanner } from "@/components/nfc-scanner"
import { CustomerInfo } from "@/components/customer-info"
import { RegisterCard } from "@/components/register-card"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

interface Customer {
  id: string
  nfc_uid: string
  name: string
  email: string
  phone: string
  points: number
  visits: number
  created_at: string
  last_visit: string
}

type ViewState = "scanning" | "customer" | "register"

export default function Dashboard() {
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
          <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
            {viewState === "scanning" && (
              <NFCScanner
                onCustomerFound={handleCustomerFound}
                onNewCard={handleNewCard}
              />
            )}
            
            {viewState === "customer" && currentCustomer && (
              <CustomerInfo
                customer={currentCustomer}
                onClose={handleClose}
                onUpdate={handleCustomerUpdate}
              />
            )}
            
            {viewState === "register" && pendingNfcUid && (
              <RegisterCard
                nfcUid={pendingNfcUid}
                onSuccess={handleRegistrationSuccess}
                onCancel={handleClose}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
