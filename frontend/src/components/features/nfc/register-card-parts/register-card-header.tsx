import { CreditCard, Nfc } from "lucide-react"

type RegisterCardHeaderProps = {
  nfcUid: string
}

export function RegisterCardHeader({ nfcUid }: RegisterCardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-t-xl shrink-0">
      {/* Light gold solid banner */}
      <div
        className="px-6 pt-8 pb-7 flex flex-col items-center gap-2 text-center relative overflow-hidden"
        style={{
          backgroundColor: "oklch(0.96 0.02 78)",
          borderBottom: "1px solid oklch(0.88 0.06 78 / 30%)"
        }}
      >
        {/* Animated decorative blobs */}
        <div
          className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-40 blur-2xl animate-pulse"
          style={{ background: "oklch(0.88 0.06 78)", animationDuration: "3s" }}
        />
        <div
          className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-40 blur-2xl animate-pulse"
          style={{ background: "oklch(0.88 0.06 78)", animationDuration: "4s", animationDelay: "1s" }}
        />

        {/* Title */}
        <div className="relative z-10 mb-2">
          <h2 className="text-xl font-bold leading-tight tracking-tight" style={{ color: "oklch(0.25 0 0)" }}>
            New Client Registration
          </h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.45 0.05 78)" }}>
            Register this NFC card with client information
          </p>
        </div>

        {/* NFC UID badge with pulse animation */}
        <div
          className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono tracking-widest shadow-sm"
          style={{
            background: "oklch(1 0 0 / 70%)",
            borderColor: "oklch(0.88 0.06 78 / 50%)",
            color: "oklch(0.35 0.02 78)",
          }}
        >
          <div className="relative flex h-2 w-2 items-center justify-center mr-0.5">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "oklch(0.78 0.13 78)" }}></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "oklch(0.68 0.10 78)" }}></span>
          </div>
          <Nfc className="h-3.5 w-3.5 shrink-0" />
          {nfcUid}
          <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-60 ml-1.5" />
        </div>
      </div>
    </div>
  )
}
