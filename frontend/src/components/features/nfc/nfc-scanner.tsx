import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import {
  MAX_AVG_KEYSTROKE_INTERVAL,
  MIN_CHARS_FOR_VALIDATION,
  WARNING_DISPLAY_DURATION,
} from "./nfc-scanner-parts/nfc-scanner-config"
import { NFCScannerHeader } from "./nfc-scanner-parts/nfc-scanner-header"
import { NFCScannerInput } from "./nfc-scanner-parts/nfc-scanner-input"
import { getAverageKeystrokeInterval } from "./nfc-scanner-parts/nfc-scanner-timing"
// import { handleMockNFCScan } from "../../../../../../utils/mock-nfc-scanner"

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

  const showWarningMessage = () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    setShowWarning(true)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(false)
    }, WARNING_DISPLAY_DURATION)
  }

  const clearWarning = () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    setShowWarning(false)
  }

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [])

  const resetInputTracking = () => {
    keystrokeTimestamps.current = []
    inputStartTime.current = null
    setIsValidInput(true)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now()

    if (e.key === "Enter") {
      handleScan(e)
      return
    }

    if (!/^\d$/.test(e.key)) {
      if (e.key === "Backspace" || e.key === "Delete") {
        resetInputTracking()
        return
      }
      e.preventDefault()
      return
    }

    const currentValue = (e.currentTarget as HTMLInputElement).value
    if (currentValue.length >= 10) {
      e.preventDefault()
      return
    }

    if (inputStartTime.current === null) {
      inputStartTime.current = now
    }
    keystrokeTimestamps.current.push(now)

    if (keystrokeTimestamps.current.length >= 3) {
      const avgInterval = getAverageKeystrokeInterval(keystrokeTimestamps.current)
      
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

    const timestamps = keystrokeTimestamps.current
    if (timestamps.length >= 2) {
      const avgInterval = getAverageKeystrokeInterval(timestamps)
      
      if (avgInterval > MAX_AVG_KEYSTROKE_INTERVAL) {
        console.log(`Manual typing detected (avg ${avgInterval.toFixed(0)}ms between keystrokes)`)
        setIsValidInput(false)
        showWarningMessage()
        resetInputTracking()
        target.value = ""
        return
      }
    }

    resetInputTracking()
    clearWarning()

    if (uid === lastScanned) {
      target.value = ""
      return
    }

    setIsLoading(true)
    setLastScanned(uid)
    
    try {
      const { data: customer, error } = await supabase
        .from("customers")
        .select("*")
        .eq("nfc_uid", uid)
        .single()

      if (error || !customer) {
        onNewCard(uid)
      } else {
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

  // const handleMockScan = async () => {
  //   await handleMockNFCScan(onCustomerFound, onNewCard, setIsLoading, setLastScanned)
  // }

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
        {/* <Button
          onClick={handleMockScan}
          disabled={isLoading}
          className="w-full mt-4"
          variant="outline"
        >
          {isLoading ? "Scanning..." : "Mock Scan (Test)"}
        </Button> */}
      </CardContent>
    </Card>
  )
}
