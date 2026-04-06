/**
 * Reset Password Page
 * ===================
 *
 * Handles the password reset flow after a user clicks the
 * reset link from their email. Supabase redirects here with
 * a recovery session, triggering the PASSWORD_RECOVERY event.
 */

import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Plasma } from "@/components/ui/plasma"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    document.title = "Reset Password - FG Aesthetic Centre"

    const params = new URLSearchParams(location.hash.replace(/^#/, ""))
    const errorCode = params.get("error_code")
    const errorDescription = params.get("error_description")
    const errorType = params.get("error")

    // Supabase will return errors in the URL hash when the reset link is invalid/expired.
    if (errorType || errorCode) {
      const message =
        errorDescription ||
        (errorCode === "otp_expired"
          ? "This link has expired. Request a new password reset email."
          : "Invalid or expired reset link. Request a new password reset email.")
      setLinkError(decodeURIComponent(message.replace(/\+/g, " ")))
      setError(null)
      setTimedOut(true)
      return
    }

    // Try to detect whether Supabase already created a session (fast path).
    const detectSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setTimedOut(false)
        setLinkError(null)
        setReady(true)
      }
    }
    detectSession()

    // Also listen for PASSWORD_RECOVERY in case it comes after mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTimedOut(false)
        setLinkError(null)
        setReady(true)
      }
    })

    // If the event never fires (e.g. bad/expired link), show a gentle message but keep trying.
    const timeout = window.setTimeout(() => {
      if (!ready) {
        setLinkError(
          "Still verifying link... If this takes too long, request a new password reset email."
        )
        setTimedOut(true)
      }
    }, 20_000)

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [location.hash, ready])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLinkError(null)

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

  const handleRequestNewReset = () => {
    navigate("/login", {
      replace: true,
      state: { gotoForgot: true },
    })
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-black p-6 md:p-10">
      {/* Animated Plasma Background */}
      <div className="absolute inset-0 z-0">
        <Plasma
          color="#808080"
          speed={0.6}
          direction="forward"
          scale={1.1}
          opacity={0.8}
          mouseInteractive={false}
        />
      </div>

      {/* Reset Password Card */}
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Card className="overflow-hidden p-0 border-border/40 bg-background/85 backdrop-blur-xl shadow-2xl">
          <CardContent className="grid p-0 md:grid-cols-1">
            <div className="p-6 md:p-8">
              {/* Company Logo & Name */}
              <div className="flex justify-center gap-3 mb-8">
                <a href="#" className="flex items-center gap-3">
                  <img src="/logo/logo-orig.svg" alt="FG Aesthetic Centre Logo" className="h-10 w-auto" />
                  <span className="font-manrope font-medium text-lg tracking-wide">FG AESTHETIC CENTRE</span>
                </a>
              </div>

              <div className="flex flex-col items-center gap-2 text-center mb-6">
                <h1 className="text-xl font-bold">Set new password</h1>
                <p className="text-muted-foreground text-sm text-balance">
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
                <>
                  {linkError ? (
                    <div className="flex flex-col gap-6">
                      <div className="text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 p-3 rounded-md text-center">
                        {linkError}
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button variant="secondary" onClick={handleRequestNewReset}>
                          Request a new reset email
                        </Button>
                        <Button variant="ghost" onClick={() => navigate("/login", { replace: true })}>
                          Back to login
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                      <FieldGroup>
                        {error && (
                          <div className="text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 p-3 rounded-md text-center">
                            {error}
                          </div>
                        )}

                        <Field>
                          <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                          <PasswordInput
                            id="new-password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                          <PasswordInput
                            id="confirm-password"
                            autoComplete="new-password"
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
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
