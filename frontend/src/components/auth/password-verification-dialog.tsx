/**
 * Password Verification Dialog
 * ============================
 *
 * A reusable dialog component for verifying user password before dangerous operations
 * like deleting accounts or appointments. Provides secure confirmation with password re-entry.
 */

import { useState } from "react"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PasswordVerificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerify: (password: string) => Promise<void>
  title?: string
  description?: string
  actionLabel?: string
  isVerifying?: boolean
  error?: string | null
}

export function PasswordVerificationDialog({
  open,
  onOpenChange,
  onVerify,
  title = "Verify Your Password",
  description = "This action requires password verification for security. Please enter your password to continue.",
  actionLabel = "Verify & Delete",
  isVerifying = false,
  error = null,
}: PasswordVerificationDialogProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!password.trim()) {
      setLocalError("Password is required")
      return
    }

    setLocalError(null)
    try {
      await onVerify(password)
      setPassword("")
      setShowPassword(false)
    } catch (err) {
      // Error is handled by parent component
      setPassword("")
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPassword("")
      setShowPassword(false)
      setLocalError(null)
    }
    onOpenChange(newOpen)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isVerifying) {
      handleVerify()
    }
  }

  const currentError = error || localError

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleVerify()
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning box */}
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">⚠️ This action cannot be undone</p>
              <p className="text-xs mt-1">Please ensure you've made regular backups before proceeding.</p>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              {/* Hidden decoy username input to trap password managers */}
              <input 
                type="text" 
                name="fake_username" 
                autoComplete="username" 
                className="sr-only" 
                aria-hidden="true" 
                tabIndex={-1}
                defaultValue="verification" 
              />
              
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setLocalError(null)
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isVerifying}
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isVerifying}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {currentError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {currentError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isVerifying || !password.trim()}
            >
              {isVerifying ? "Verifying..." : actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
