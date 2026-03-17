import { CreditCard, Loader2 } from "lucide-react"

type NFCScannerHeaderProps = {
  isLoading: boolean
  mode?: "scan" | "register"
}

export function NFCScannerHeader({ isLoading, mode = "scan" }: NFCScannerHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-6 pt-2 pb-4">
      {/* Animated NFC icon with pulse rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse rings */}
        <div className="absolute h-32 w-32 rounded-full border border-primary/10 animate-[nfcPing_2.5s_ease-out_infinite]" />
        <div className="absolute h-28 w-28 rounded-full border border-primary/15 animate-[nfcPing_2.5s_ease-out_0.5s_infinite]" />
        <div className="absolute h-24 w-24 rounded-full border border-primary/20 animate-[nfcPing_2.5s_ease-out_1s_infinite]" />

        {/* Glowing backdrop */}
        <div className="absolute h-20 w-20 rounded-full bg-primary/5 blur-xl animate-[nfcGlow_3s_ease-in-out_infinite]" />

        {/* Icon container */}
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm shadow-[0_0_40px_rgba(0,0,0,0.08)]">
          {isLoading ? (
            <Loader2 className="h-9 w-9 text-primary animate-spin" />
          ) : (
            <CreditCard className="h-9 w-9 text-primary transition-transform duration-500 hover:scale-110" />
          )}
        </div>
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {isLoading
            ? "Reading Card..."
            : mode === "register"
            ? "Scan to register"
            : "Ready to Scan"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
          {isLoading
            ? "Processing NFC card data"
            : mode === "register"
            ? "Place a new NFC card on the reader to register a new customer"
            : "Place the NFC card on the reader to identify the customer"}
        </p>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          {isLoading ? "Processing" : "Scanner Active"}
        </span>
      </div>
    </div>
  )
}
