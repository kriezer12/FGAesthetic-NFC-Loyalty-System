/**
 * usePasswordVerification Hook
 * ============================
 *
 * A reusable hook for verifying password for sensitive operations.
 * Can be used for both account and appointment deletions.
 */

import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"

export function usePasswordVerification() {
  const { session, user } = useAuth()

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      if (!session?.access_token) {
        throw new Error("Authentication session not found. Please login again.")
      }

      if (!user) {
        throw new Error("User not authenticated. Please login again.")
      }

      const response = await apiCall("/accounts/verify-password", {
        method: "POST",
        authToken: session.access_token,
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = data.error || `Password verification failed (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data.verified === true
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      throw new Error(message)
    }
  }

  return { verifyPassword }
}
