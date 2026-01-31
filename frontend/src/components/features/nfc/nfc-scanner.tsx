import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

import type { Customer } from "@/types/customer"

interface NFCScannerProps {
  onCustomerFound: (customer: Customer) => void
  onNewCard: (nfcUid: string) => void
}

// USB NFC readers input characters much faster than human typing
// Threshold in ms - if avg time between keystrokes is above this, it's manual typing
const MAX_AVG_KEYSTROKE_INTERVAL = 50
const MIN_CHARS_FOR_VALIDATION = 8

const WARNING_DISPLAY_DURATION = 5000 // 5 seconds

export function NFCScanner({ onCustomerFound, onNewCard }: NFCScannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [isValidInput, setIsValidInput] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const keystrokeTimestamps = useRef<number[]>([])  
  const inputStartTime = useRef<number | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep input focused for NFC scanning
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
    
    focusInput()
    const interval = setInterval(focusInput, 500)
    
    return () => clearInterval(interval)
  }, [])

  // Show warning message for 5 seconds
  const showWarningMessage = () => {
    // Clear any existing timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    setShowWarning(true)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(false)
    }, WARNING_DISPLAY_DURATION)
  }

  // Clear warning immediately (e.g., when NFC scan succeeds)
  const clearWarning = () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    setShowWarning(false)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [])

  // Reset input tracking when field is cleared or after inactivity
  const resetInputTracking = () => {
    keystrokeTimestamps.current = []
    inputStartTime.current = null
    setIsValidInput(true)
  }

  // Track keystroke timing to detect USB reader vs manual typing
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now()

    // Handle Enter key - process the scan
    if (e.key === "Enter") {
      handleScan(e)
      return
    }

    // Ignore modifier keys
    if (e.key.length > 1 && e.key !== "Backspace" && e.key !== "Delete") {
      return
    }

    // Handle backspace/delete - likely manual typing, reset
    if (e.key === "Backspace" || e.key === "Delete") {
      resetInputTracking()
      return
    }

    // Record timestamp for this keystroke
    if (inputStartTime.current === null) {
      inputStartTime.current = now
    }
    keystrokeTimestamps.current.push(now)

    // Check if typing speed indicates manual input
    if (keystrokeTimestamps.current.length >= 3) {
      const intervals: number[] = []
      for (let i = 1; i < keystrokeTimestamps.current.length; i++) {
        intervals.push(keystrokeTimestamps.current[i] - keystrokeTimestamps.current[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      
      // If average interval is too slow, it's manual typing - clear immediately
      if (avgInterval > MAX_AVG_KEYSTROKE_INTERVAL) {
        setIsValidInput(false)
        showWarningMessage()
        if (inputRef.current) {
          inputRef.current.value = ""
        }
        resetInputTracking()
      }
    }
  }

  const handleScan = async (e: KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget
    const uid = target.value.trim()
    
    // Validate input length
    if (!uid || uid.length < MIN_CHARS_FOR_VALIDATION) {
      resetInputTracking()
      target.value = ""
      return
    }

    // Check if input was from USB reader (fast enough typing speed)
    const timestamps = keystrokeTimestamps.current
    if (timestamps.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      
      if (avgInterval > MAX_AVG_KEYSTROKE_INTERVAL) {
        // Too slow - manual typing detected, reject
        console.log(`Manual typing detected (avg ${avgInterval.toFixed(0)}ms between keystrokes)`)
        setIsValidInput(false)
        showWarningMessage()
        resetInputTracking()
        target.value = ""
        return
      }
    }

    // Reset validation state and clear any warning
    resetInputTracking()
    clearWarning()

    // Prevent duplicate scans
    if (uid === lastScanned) {
      target.value = ""
      return
    }

    setIsLoading(true)
    setLastScanned(uid)
    
    try {
      // Check if NFC card exists in database
      const { data: customer, error } = await supabase
        .from("customers")
        .select("*")
        .eq("nfc_uid", uid)
        .single()

      if (error || !customer) {
        // Card not found - trigger registration
        onNewCard(uid)
      } else {
        // Card found - show customer info
        onCustomerFound(customer)
      }
    } catch (err) {
      console.error("Error checking NFC card:", err)
      onNewCard(uid)
    } finally {
      setIsLoading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
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
      <CardContent>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Waiting for NFC card..."
          className={`text-center text-lg tracking-widest border-2 border-dashed focus:border-primary ${
            isValidInput ? "border-primary/30" : "border-destructive/50"
          }`}
          onKeyDown={handleKeyDown}
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
      </CardContent>
    </Card>
  )
}
