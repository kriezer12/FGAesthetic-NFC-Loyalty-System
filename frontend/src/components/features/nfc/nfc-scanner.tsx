import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { supabase } from "@/lib/supabase"
import { apiCall } from "@/lib/api"
import {
  MAX_AVG_KEYSTROKE_INTERVAL,
  MIN_CHARS_FOR_VALIDATION,
  WARNING_DISPLAY_DURATION,
} from "./nfc-scanner-parts/nfc-scanner-config"
import { NFCScannerHeader } from "./nfc-scanner-parts/nfc-scanner-header"
import { NFCScannerInput } from "./nfc-scanner-parts/nfc-scanner-input"
import { getAverageKeystrokeInterval } from "./nfc-scanner-parts/nfc-scanner-timing"

import type { Customer } from "@/types/customer"

interface NFCScannerProps {
  onCustomerFound: (customer: Customer) => void
  onNewCard: (nfcUid: string) => void
  onSkipScan?: () => void
  mode?: "scan" | "register"
}

export function NFCScanner({ onCustomerFound, onNewCard, onSkipScan, mode = "scan" }: NFCScannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [isValidInput, setIsValidInput] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const keystrokeTimestamps = useRef<number[]>([])  
  const inputStartTime = useRef<number | null>(null)
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        throw new Error("No active session")
      }

      const response = await apiCall(`/pos/nfc/${uid}`, { authToken: token })
      
      if (!response.ok) {
        if (response.status === 404) {
          onNewCard(uid)
          return
        }
        throw new Error(`API error: ${response.status}`)
      }

      const customer = await response.json()
      
      if (customer) {
        onCustomerFound(customer)
      } else {
        onNewCard(uid)
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
    <div className="w-full max-w-md mx-auto">
      {/* Inline keyframes for NFC animations */}
      <style>{`
        @keyframes nfcPing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes nfcGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>

      {/* Glass card container */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 p-8 flex flex-col gap-6">
          <NFCScannerHeader isLoading={isLoading} mode={mode} />
          <NFCScannerInput
            inputRef={inputRef}
            isValidInput={isValidInput}
            showWarning={showWarning}
            onKeyDown={handleKeyDown}
          />
          {mode === "register" && onSkipScan && (
            <button
              onClick={onSkipScan}
              className="mt-2 text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
            >
              Don't have a card? Register without one
            </button>
          )}
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      </div>
    </div>
  )
}
