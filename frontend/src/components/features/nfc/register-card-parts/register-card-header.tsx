import { CreditCard, UserPlus } from "lucide-react"

type RegisterCardHeaderProps = {
  nfcUid: string
}

export function RegisterCardHeader({ nfcUid }: RegisterCardHeaderProps) {
  return (
    <div className="px-6 pt-6 pb-4 border-b flex flex-col items-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <UserPlus className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold leading-tight">New Client Registration</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Register this NFC card with client information</p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono text-xs tracking-widest">{nfcUid}</span>
      </div>
    </div>
  )
}
