import { CreditCard, Loader2 } from "lucide-react"

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type NFCScannerHeaderProps = {
  isLoading: boolean
}

export function NFCScannerHeader({ isLoading }: NFCScannerHeaderProps) {
  return (
    <CardHeader className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        {isLoading ? (
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        ) : (
          <CreditCard className="h-8 w-8 text-primary" />
        )}
      </div>
      <CardTitle>NFC Scanner Ready</CardTitle>
      <CardDescription>
        Tap an NFC card to scan. The system will automatically detect if the card is registered.
      </CardDescription>
    </CardHeader>
  )
}
