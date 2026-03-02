import { Calendar, Mail, Phone } from "lucide-react"

import type { Customer } from "@/types/customer"

type CustomerContactDetailsProps = {
  customer: Customer
  formatDate: (dateString?: string) => string
}

export function CustomerContactDetails({ customer, formatDate }: CustomerContactDetailsProps) {
  return (
    <div className="space-y-3">
      {customer.phone && (
        <div className="flex items-center gap-3 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{customer.phone}</span>
        </div>
      )}
      {customer.email && (
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{customer.email}</span>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Member since {formatDate(customer.created_at)}</span>
      </div>
    </div>
  )
}
