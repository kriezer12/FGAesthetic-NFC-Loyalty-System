import { type KeyboardEvent, type RefObject } from "react"
import { AlertTriangle, Shield } from "lucide-react"

import { Input } from "@/components/ui/input"

type NFCScannerInputProps = {
  inputRef: RefObject<HTMLInputElement | null>
  isValidInput: boolean
  showWarning: boolean
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function NFCScannerInput({ inputRef, isValidInput, showWarning, onKeyDown }: NFCScannerInputProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Scanner input area */}
      <div className="relative group">
        {/* Decorative border animation */}
        <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-r ${
          isValidInput
            ? "from-primary/20 via-primary/40 to-primary/20"
            : "from-destructive/30 via-destructive/50 to-destructive/30"
        } opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-[1px]`} />

        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Waiting for NFC card..."
            className={`relative z-10 h-14 text-center text-lg tracking-[0.3em] font-medium rounded-xl border-2 border-dashed bg-background/80 backdrop-blur-sm focus:border-primary focus:bg-background caret-transparent [&:-webkit-autofill]:[background-color:transparent!important] [&:-webkit-autofill]:[box-shadow:0_0_0_30px_transparent_inset!important] [&:-webkit-autofill]:[-webkit-text-fill-color:transparent!important] [-webkit-text-security:disc] placeholder:text-muted-foreground/50 placeholder:tracking-widest placeholder:text-sm transition-all duration-300 ${
              isValidInput ? "border-primary/20" : "border-destructive/40"
            }`}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>

      {/* Warning message */}
      {showWarning && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-destructive">Manual Input Detected</span>
            <span className="text-xs text-destructive/70">Please use the NFC reader device to scan cards</span>
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <Shield className="h-3.5 w-3.5 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground/60">
          Secure NFC authentication • Auto-detect enabled
        </p>
      </div>
    </div>
  )
}
