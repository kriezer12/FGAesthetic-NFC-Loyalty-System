/**
 * Create Account Form Component
 * =============================
 *
 * Form for creating new user accounts.
 * Only superadmin and branch_admin can access this.
 */

import { useState, type FormEvent } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useBranches } from "@/hooks/use-branches"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { apiCall } from "@/lib/api"
import type { UserRole } from "@/types/user"

interface CreateAccountFormProps {
  onSuccess?: () => void
}

export function CreateAccountForm({ onSuccess }: CreateAccountFormProps) {
  const { userProfile } = useAuth()
  const isSuper = userProfile?.role === "super_admin"

  const allRoleOptions = [
    { value: "staff", label: "Staff" },
    { value: "branch_admin", label: "Branch Admin" },
    { value: "super_admin", label: "Super Admin" },
  ]
  const roleOptions = isSuper ? allRoleOptions : allRoleOptions.filter(r => r.value === "staff")

  const { branches } = useBranches()

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("staff")
  // default branch for branch_admin
  const [branch, setBranch] = useState(isSuper ? "" : userProfile?.branch_id || "") // holds branch_id
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Call backend endpoint to create account
      const body: any = { email, role }
      if (isSuper && branch) {
        body.branch_id = branch
      } else if (!isSuper && userProfile?.branch_id) {
        body.branch_id = userProfile.branch_id
      }
      const response = await apiCall("/api/accounts/create", {
        method: "POST",
        body: JSON.stringify(body),
      })

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = "Failed to create account"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {}
        setError(errorMessage)
        setLoading(false)
        return
      }

      const data = await response.json()

      setSuccess(`Account created successfully for ${email}`)
      // Reset form
      setEmail("")
      setRole("staff")
      setBranch("")
      
      // Call success callback after a short delay to show the message
      if (onSuccess) {
        setTimeout(onSuccess, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/50 p-3 rounded-md">
          {success}
        </div>
      )}

      <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/50 p-3 rounded-md">
        New accounts are created with a default password: <strong>password</strong>. Users will be required to change it on their first login.
      </div>

      <FieldGroup>
    
          {/* Email field */}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          {/* Role field */}
          <Field>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <Combobox
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              options={roleOptions}
              placeholder="Select role"
              searchPlaceholder="Search role..."
              emptyMessage="No role found."
            />
          </Field>

          {isSuper && (
            <Field>
              <FieldLabel htmlFor="branch">Branch</FieldLabel>
              <Combobox
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                value={branch}
                onValueChange={(val) => setBranch(val)}
                placeholder="Select branch"
              />
            </Field>
          )}


        </FieldGroup>

        {/* Submit button */}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
    </form>
  )
}
