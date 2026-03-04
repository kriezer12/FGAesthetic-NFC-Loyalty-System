import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  MAX_AVG_KEYSTROKE_INTERVAL,
  MIN_CHARS_FOR_VALIDATION,
  WARNING_DISPLAY_DURATION,
} from "./nfc-scanner-parts/nfc-scanner-config"
import { NFCScannerHeader } from "./nfc-scanner-parts/nfc-scanner-header"
import { NFCScannerInput } from "./nfc-scanner-parts/nfc-scanner-input"
import { getAverageKeystrokeInterval } from "./nfc-scanner-parts/nfc-scanner-timing"
import { handleMockNFCScan } from "./nfc-scanner-parts/mock-nfc-scanner"

import type { Customer } from "@/types/customer"

interface NFCScannerProps {
  onCustomerFound: (customer: Customer) => void
  onNewCard: (nfcUid: string) => void
}

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

    // Only allow digits (0-9)
    if (!/^\d$/.test(e.key)) {
      // Allow Backspace and Delete for clearing
      if (e.key === "Backspace" || e.key === "Delete") {
        resetInputTracking()
        return
      }
      // Block all other keys
      e.preventDefault()
      return
    }

    // Prevent input if already 10 digits
    const currentValue = (e.currentTarget as HTMLInputElement).value
    if (currentValue.length >= 10) {
      e.preventDefault()
      return
    }

    // Record timestamp for this keystroke
    if (inputStartTime.current === null) {
      inputStartTime.current = now
    }
    keystrokeTimestamps.current.push(now)

    // Check if typing speed indicates manual input
    if (keystrokeTimestamps.current.length >= 3) {
      const avgInterval = getAverageKeystrokeInterval(keystrokeTimestamps.current)
      
      // If average interval is too slow, it's manual typing - clear immediately
      if (avgInterval > MAX_AVG_KEYSTROKE_INTERVAL) {
        setIsValidInput(false)
        showWarningMessage()
        if (inputRef.current) {
          inputRef.current.value = ""
        }
        resetInputTracking()
        return
      }
    }

    // Auto-submit when 10 digits are entered
    // Use setTimeout to ensure the input value is updated first
    setTimeout(() => {
      const input = inputRef.current
      if (input && input.value.length === 10) {
        handleScan({ currentTarget: input } as any)
      }
    }, 0)
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
      const avgInterval = getAverageKeystrokeInterval(timestamps)
      
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

  // Temporary mock function for testing without physical scanner
  const handleMockScan = async () => {
    await handleMockNFCScan(onCustomerFound, onNewCard, setIsLoading, setLastScanned)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <NFCScannerHeader isLoading={isLoading} />
      <CardContent>
        <NFCScannerInput
          inputRef={inputRef}
          isValidInput={isValidInput}
          showWarning={showWarning}
          onKeyDown={handleKeyDown}
        />
        {/* Temporary mock scanner button for testing */}
        <Button
          onClick={handleMockScan}
          disabled={isLoading}
          className="w-full mt-4"
          variant="outline"
        >
          {isLoading ? "Scanning..." : "Mock Scan (Test)"}
        </Button>
      </CardContent>
    </Card>
  )
}
