/**
 * Customer Login Page
 * ===================
 *
 * Dedicated login page for customers who registered via NFC scan.
 * Customers log in with email and password to access their portal.
 */

import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Plasma } from "@/components/ui/plasma"

export default function CustomerLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)

  useEffect(() => {
    document.title = "Customer Login - FG Aesthetic Centre"
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
      } else {
        navigate("/portal/dashboard", { replace: true })
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotSuccess(null)
    setError(null)
    setForgotLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        forgotEmail,
        {
          redirectTo: `${window.location.origin}/reset-password?redirect=/portal/dashboard`,
        }
      )

      if (resetError) {
        setError(resetError.message)
      } else {
        setForgotSuccess("Password reset email sent. Check your inbox.")
        setForgotEmail("")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setForgotLoading(false)
    }
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

      {/* Login Card */}
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Card className="overflow-hidden p-0 border-border/40 bg-background/85 backdrop-blur-xl shadow-2xl">
          <CardContent className="grid p-0 md:grid-cols-1">
            <div className="p-6 md:p-8">
              {/* Company Logo & Name */}
              <div className="flex justify-center gap-3 mb-8">
                <a href="#" className="flex items-center gap-3">
                  <img
                    src="/logo/logo-orig.svg"
                    alt="FG Aesthetic Centre Logo"
                    className="h-10 w-auto"
                    loading="lazy"
                  />
                  <span className="font-manrope font-medium text-lg tracking-wide">FG AESTHETIC CENTRE</span>
                </a>
              </div>

              {/* Customer Login Form or Forgot Password Form */}
              {!forgotMode ? (
                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  {/* Header */}
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-xl font-bold">Customer Portal</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Sign in to view your appointments and history
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Email Field */}
                  <FieldGroup>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </FieldGroup>

                  {/* Password Field */}
                  <FieldGroup>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </FieldGroup>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>

                  {/* Forgot Password Link */}
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-center text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    Forgot password?
                  </button>

                  {/* Switch to Staff Login */}
                  <div className="border-t border-border/40 pt-4 mt-2">
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      Are you a staff member?
                    </p>
                    <Link to="/login" className="block">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                      >
                        Staff Login
                      </Button>
                    </Link>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
                  {/* Header */}
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-xl font-bold">Reset your password</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  {forgotSuccess && (
                    <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                      {forgotSuccess}
                    </div>
                  )}

                  {/* Email Field */}
                  <FieldGroup>
                    <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      disabled={forgotLoading}
                    />
                  </FieldGroup>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full"
                    size="lg"
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  {/* Back to Login */}
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false)
                      setError(null)
                      setForgotSuccess(null)
                    }}
                    className="text-center text-sm text-primary hover:underline"
                    disabled={forgotLoading}
                  >
                    Back to login
                  </button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
