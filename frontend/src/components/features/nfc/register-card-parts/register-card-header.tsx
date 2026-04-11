import { CreditCard, Nfc } from "lucide-react"

type RegisterCardHeaderProps = {
  nfcUid: string
}

export function RegisterCardHeader({ nfcUid }: RegisterCardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-t-2xl shrink-0">
      <div
        className="px-6 pt-8 pb-7 flex flex-col items-center gap-2 text-center relative overflow-hidden bg-primary/10 border-b border-primary/20"
      >
        <div
          className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-primary/20 blur-2xl animate-pulse"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-primary/20 blur-2xl animate-pulse"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        />

        <div className="relative z-10 mb-2">
          <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground">
            New Client Registration
          </h2>
          <p className="text-sm mt-1 text-muted-foreground">
            Register this NFC card with client information
          </p>
        </div>

        <div
          className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-background/80 backdrop-blur-sm text-xs font-mono tracking-widest shadow-sm text-primary"
        >
          <div className="relative flex h-2 w-2 items-center justify-center mr-0.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
          </div>
          <Nfc className="h-3.5 w-3.5 shrink-0" />
          {nfcUid}
          <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-60 ml-1.5" />
        </div>
      </div>
    </div>
  )
}
