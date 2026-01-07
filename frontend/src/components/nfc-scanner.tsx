import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { CreditCard, UserPlus, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

interface Customer {
  id: string
  nfc_uid: string
  name: string
  email: string
  phone: string
  points: number
  visits: number
  created_at: string
  last_visit: string
}

interface NFCScannerProps {
  onCustomerFound: (customer: Customer) => void
  onNewCard: (nfcUid: string) => void
}

export function NFCScanner({ onCustomerFound, onNewCard }: NFCScannerProps) {
  const [isScanning, setIsScanning] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep input focused for NFC scanning
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && isScanning) {
        inputRef.current.focus()
      }
    }
    
    focusInput()
    const interval = setInterval(focusInput, 500)
    
    return () => clearInterval(interval)
  }, [isScanning])

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const uid = (e.target as HTMLInputElement).value.trim()
      
      if (!uid || uid.length < 8) {
        return
      }

      // Prevent duplicate scans
      if (uid === lastScanned) {
        (e.target as HTMLInputElement).value = ""
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
          className="text-center text-lg tracking-widest border-2 border-dashed border-primary/30 focus:border-primary"
          onKeyDown={handleScan}
          autoComplete="off"
          autoFocus
        />
        <p className="text-xs text-muted-foreground text-center mt-4">
          Make sure the input field is focused before scanning
        </p>
      </CardContent>
    </Card>
  )
}
