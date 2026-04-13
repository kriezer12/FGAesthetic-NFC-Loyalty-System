/**
 * Customer Password Manager
 * =========================
 *
 * Component for customers to manage their password
 * Set initial password, change password, etc.
 */

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import {
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PasswordManagerProps {
  isInitialSetup?: boolean
  onSuccess?: () => void
}

export function CustomerPasswordManager({ isInitialSetup = false, onSuccess }: PasswordManagerProps) {
  const [mode] = useState<"change" | "setup">(isInitialSetup ? "setup" : "change")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Setup mode form
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Change mode form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPasswordChange, setNewPasswordChange] = useState("")
  const [confirmPasswordChange, setConfirmPasswordChange] = useState("")

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError("You must be logged in")
        return
      }

      const response = await fetch("/api/customer/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to set password")
      } else {
        setSuccess("Password set successfully!")
        setNewPassword("")
        setConfirmPassword("")
        setTimeout(() => {
          onSuccess?.()
        }, 1500)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPasswordChange.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }

    if (newPasswordChange !== confirmPasswordChange) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError("You must be logged in")
        return
      }

      const response = await fetch("/api/customer/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPasswordChange,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to change password")
      } else {
        setSuccess("Password changed successfully!")
        setCurrentPassword("")
        setNewPasswordChange("")
        setConfirmPasswordChange("")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (mode === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>Create a secure password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetupPassword} className="space-y-5">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {success && <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">{success}</div>}

            <FieldGroup>
              <FieldLabel htmlFor="new-password">Password</FieldLabel>
              <PasswordInput
                id="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <PasswordInput
                id="confirm-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </FieldGroup>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Setting password..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-5">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">{success}</div>}

          <FieldGroup>
            <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
            <PasswordInput
              id="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={loading}
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="new-password-change">New Password</FieldLabel>
            <PasswordInput
              id="new-password-change"
              placeholder="••••••••"
              value={newPasswordChange}
              onChange={(e) => setNewPasswordChange(e.target.value)}
              required
              disabled={loading}
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="confirm-password-change">Confirm New Password</FieldLabel>
            <PasswordInput
              id="confirm-password-change"
              placeholder="••••••••"
              value={confirmPasswordChange}
              onChange={(e) => setConfirmPasswordChange(e.target.value)}
              required
              disabled={loading}
            />
          </FieldGroup>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Changing password..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
