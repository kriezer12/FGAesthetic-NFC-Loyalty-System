/**
 * Reset Password Page
 * ===================
 *
 * Handles the password reset flow after a user clicks the
 * reset link from their email. Supabase redirects here with
 * a recovery session, triggering the PASSWORD_RECOVERY event.
 */

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    document.title = "Reset Password - FG Aesthetic Centre"

    // Wait for Supabase to fire PASSWORD_RECOVERY and set the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setError(error.message)
      } else {
        // Sign out so the user logs in fresh with their new password
        await supabase.auth.signOut()
        navigate("/login", {
          replace: true,
          state: { message: "Password updated successfully. Please log in." },
        })
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-3 md:justify-start">
          <a href="#" className="flex items-center gap-3">
            <img src="/logo/logo-orig.svg" alt="FG Aesthetic Centre Logo" className="h-10 w-auto" />
            <span className="font-manrope font-medium text-lg tracking-wide">FG AESTHETIC CENTRE</span>
          </a>
        </div>

        <div className="flex flex-1 items-start justify-center pt-45">
          <div className="w-full max-w-sm flex flex-col gap-8">

            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-4xl font-bold">Set new password</h1>
              <p className="text-muted-foreground text-base text-balance">
                Choose a strong password for your account
              </p>
            </div>

            {!ready && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground text-sm">Verifying reset link…</p>
              </div>
            )}

            {ready && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                <FieldGroup>
                  {error && (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-md text-center">
                      {error}
                    </div>
                  )}

                  <Field>
                    <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Updating…" : "Update password"}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}

          </div>
        </div>
      </div>

      <div className="bg-muted relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2068&auto=format&fit=crop"
          alt="Beauty aesthetic clinic interior"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
