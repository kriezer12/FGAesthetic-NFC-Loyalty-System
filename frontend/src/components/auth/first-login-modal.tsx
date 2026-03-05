/**
 * First Login Modal Component
 * =============================
 *
 * Modal for first-time users to set their full name and password.
 * This is shown on the first login before accessing the dashboard.
 */

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

interface FirstLoginModalProps {
  isOpen: boolean
  userEmail?: string
  onComplete: () => void
}

export function FirstLoginModal({
  isOpen,
  userEmail,
  onComplete,
}: FirstLoginModalProps) {
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!fullName.trim()) {
      setError("Full name is required")
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      // Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser?.id) {
        setError("Unable to get user information")
        setLoading(false)
        return
      }

      // Update user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      // Update user profile with full name and set first_login to false
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          full_name: fullName,
          first_login: false,
        })
        .eq("id", currentUser.id)
        .select()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      // Call the onComplete callback to close the modal and refresh user context
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome! Complete Your Profile</DialogTitle>
          <DialogDescription>
            This is your first login. Please set your full name and new password to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
              {error}
            </div>
          )}

          {userEmail && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              Email: <strong>{userEmail}</strong>
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">New Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="Enter a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                At least 6 characters
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Completing Setup..." : "Complete Setup"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
