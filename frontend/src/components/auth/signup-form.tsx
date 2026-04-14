/**
 * Signup Form Component (signup-02 style)
 * ========================================
 *
 * Handles user registration via Supabase Auth.
 * Supports email/password signup with email verification
 * and Google OAuth registration.
 * Uses the shadcn signup-02 block design.
 */

import { useState, type ComponentProps, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"

// Minimum password length requirement
const MIN_PASSWORD_LENGTH = 8

type SignupFormProps = ComponentProps<"form">

export function SignupForm({ className, ...props }: SignupFormProps) {
  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  /**
   * Validate form inputs before submission
   */
  const validateForm = (): boolean => {
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return false
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
      return false
    }

    return true
  }

  /**
   * Handle email/password form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    if (!validateForm()) return

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: "customer",
          },
        },
      })

      if (error) {
        setError(error.message)
      } else {
        // Call backend to create customer record
        // This happens before email confirmation so record is ready when they log in
        try {
          const registerResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/api/customer/register-after-signup`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email.toLowerCase(),
                name: name,
              }),
            }
          )

          if (!registerResponse.ok) {
            console.error('Failed to create customer record:', registerResponse.statusText)
            // Don't fail the signup, just log the error
          }
        } catch (err) {
          console.error('Error calling customer registration:', err)
          // Don't fail the signup
        }

        // Show success message for email verification
        setSuccess(true)
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle Google OAuth signup
   */
  const handleGoogleSignup = async () => {
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  // Success state - show email verification message
  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Please check your email to
            verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/login">
            <Button className="w-full">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>

        {/* Error message display */}
        {error && (
          <div className="text-sm font-medium text-red-800 bg-red-50 dark:text-red-200 dark:bg-red-950/50 p-3 rounded-md text-center border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}


        {/* Full name field */}
        <Field>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

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
          />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email
            with anyone else.
          </FieldDescription>
        </Field>

        {/* Password field */}
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FieldDescription>
            Must be at least {MIN_PASSWORD_LENGTH} characters long.
          </FieldDescription>
        </Field>

        {/* Confirm password field */}
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <PasswordInput
            id="confirm-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <FieldDescription>Please confirm your password.</FieldDescription>
        </Field>

        {/* Submit button */}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </Field>

        {/* Separator */}
        <FieldSeparator>Or continue with</FieldSeparator>

        {/* Google OAuth button */}
        <Field>
          <Button
            variant="outline"
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Sign up with Google
          </Button>

          {/* Sign in link */}
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
