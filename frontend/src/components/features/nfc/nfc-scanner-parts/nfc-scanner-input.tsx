import { type KeyboardEvent, type RefObject } from "react"

import { Input } from "@/components/ui/input"

type NFCScannerInputProps = {
  inputRef: RefObject<HTMLInputElement | null>
  isValidInput: boolean
  showWarning: boolean
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function NFCScannerInput({ inputRef, isValidInput, showWarning, onKeyDown }: NFCScannerInputProps) {
  return (
    <>
      <Input
        ref={inputRef}
        type="text"
        placeholder="Waiting for NFC card..."
        className={`text-center text-lg tracking-widest border-2 border-dashed focus:border-primary ${
          isValidInput ? "border-primary/30" : "border-destructive/50"
        }`}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoFocus
      />
      {showWarning && (
        <p className="text-xs text-destructive text-center mt-2 animate-pulse">
          Manual typing detected. Please use the NFC reader.
        </p>
      )}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Make sure the input field is focused before scanning
      </p>
    </>
  )
}
