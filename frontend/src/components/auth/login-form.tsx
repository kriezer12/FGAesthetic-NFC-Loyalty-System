/**
 * Login Form Component (login-02 style)
 * ======================================
 *
 * Handles user authentication via Supabase Auth.
 * Supports email/password login and forgot-password flow.
 * Uses the shadcn login-02 block design.
 */

import { useState, useEffect, type ComponentProps, type FormEvent } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type LoginFormProps = ComponentProps<"form">

export function LoginForm({ className, ...props }: LoginFormProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Get the redirect path from location state (set by ProtectedRoute)
  const from = location.state?.from?.pathname || "/dashboard"
  // Message passed via router state (e.g. after a successful password reset)
  const stateMessage: string | undefined = location.state?.message

  type LoginLocationState = {
    gotoForgot?: boolean
    message?: string
  }
  const locationState = (location.state as LoginLocationState) || {}

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(stateMessage ?? null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"login" | "forgot">("login")

  // If we land here with a request to show the forgot-password flow, do so once.
  useEffect(() => {
    const gotoForgot = locationState.gotoForgot
    if (gotoForgot) {
      setMode("forgot")
      navigate(location.pathname, {
        replace: true,
        state: { ...locationState, gotoForgot: undefined },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for PASSWORD_RECOVERY event — redirect to the dedicated page
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  /**
   * Handle email/password form submission
   */
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        navigate(from, { replace: true })
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle forgot password — sends a reset email via Supabase
   */
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess("Password reset email sent. Check your inbox.")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const switchToForgot = () => {
    setError(null)
    setSuccess(null)
    setMode("forgot")
  }

  const switchToLogin = () => {
    setError(null)
    setSuccess(null)
    setMode("login")
  }

  if (mode === "forgot") {
    return (
      <form
        className={cn("flex flex-col gap-5", className)}
        onSubmit={handleForgotSubmit}
        {...props}
      >
        <FieldGroup>
          {/* Header */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-xl font-bold">Reset your password</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="text-sm font-medium text-red-800 bg-red-50 dark:text-red-200 dark:bg-red-950/50 p-3 rounded-md text-center border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm font-medium text-green-800 bg-green-50 dark:text-green-200 dark:bg-green-950/50 p-3 rounded-md text-center border border-green-200 dark:border-green-900/50">
              {success}
            </div>
          )}


          {/* Email field */}
          <Field>
            <FieldLabel htmlFor="reset-email">Email</FieldLabel>
            <Input
              id="reset-email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="border-border bg-muted/50"
            />
          </Field>

          {/* Submit button */}
          <Field>
            <Button type="submit" disabled={loading || !!success}>
              {loading ? "Sending..." : "Send reset email"}
            </Button>
          </Field>

          {/* Back to login */}
          <p className="text-center text-sm">
            <button
              type="button"
              onClick={switchToLogin}
              className="underline underline-offset-4 hover:text-primary"
            >
              Back to login
            </button>
          </p>
        </FieldGroup>
      </form>
    )
  }

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={handleLoginSubmit}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your credentials to sign in
          </p>
        </div>

        {/* Error message display */}
        {error && (
          <div className="text-sm font-medium text-red-800 bg-red-50 dark:text-red-200 dark:bg-red-950/50 p-3 rounded-md text-center border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        {/* Success message (e.g. after password reset) */}
        {success && (
          <div className="text-sm font-medium text-green-800 bg-green-50 dark:text-green-200 dark:bg-green-950/50 p-3 rounded-md text-center border border-green-200 dark:border-green-900/50">
            {success}
          </div>
        )}


        {/* Email field */}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border-border bg-muted/50"
          />
        </Field>

        {/* Password field */}
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <button
              type="button"
              onClick={switchToForgot}
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="border-border bg-muted/50"
          />
        </Field>

        {/* Submit button */}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
