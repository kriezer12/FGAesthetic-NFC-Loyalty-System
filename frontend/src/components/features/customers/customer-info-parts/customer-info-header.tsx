import { CreditCard, User } from "lucide-react"

import type { Customer } from "@/types/customer"

type CustomerInfoHeaderProps = {
  customer: Customer
  displayName: string
}

export function CustomerInfoHeader({ customer, displayName }: CustomerInfoHeaderProps) {
  return (
    <>
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <User className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">{displayName}</h2>
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        {customer.nfc_uid}
      </p>
      {customer.skin_type && (
        <p className="text-xs text-muted-foreground capitalize mt-1">
          {customer.skin_type} skin {customer.gender && `• ${customer.gender}`}
        </p>
      )}
    </>
  )
}
