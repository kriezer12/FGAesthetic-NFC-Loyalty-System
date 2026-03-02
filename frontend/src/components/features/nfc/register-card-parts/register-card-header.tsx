import { CreditCard, UserPlus } from "lucide-react"

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type RegisterCardHeaderProps = {
  nfcUid: string
}

export function RegisterCardHeader({ nfcUid }: RegisterCardHeaderProps) {
  return (
    <CardHeader className="text-center sticky top-0 bg-background z-10 pb-4">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <UserPlus className="h-8 w-8 text-blue-600" />
      </div>
      <CardTitle>New Client Registration</CardTitle>
      <CardDescription>
        Register this NFC card with client information
      </CardDescription>
      <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg mt-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">{nfcUid}</span>
      </div>
    </CardHeader>
  )
}
