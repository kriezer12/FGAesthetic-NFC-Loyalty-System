import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"

export interface Account {
  id: string
  email: string
  full_name: string
  role: "staff" | "branch_admin" | "super_admin"
  is_active: boolean
  created_at?: string
  branch_id?: string | null
  branch_name?: string | null
  avatar_url?: string | null
  deleted_at?: string | null
}

export function useAccounts() {
  const { user, session } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = async () => {
    if (!user || !session) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiCall("/accounts/list?status=all", {
        authToken: session.access_token,
      })
      if (!response.ok) {
        throw new Error("Failed to fetch accounts")
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const updateAccount = async (
    userId: string,
    updates: Partial<Account>
  ) => {
    try {
      const response = await apiCall(`/accounts/${userId}`, {
        method: "PUT",
        authToken: session?.access_token,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Failed to update account")
      }

      const data = await response.json()
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === userId ? data.user : acc))
      )
      return data.user
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
      throw err
    }
  }

  const deleteAccount = async (userId: string) => {
    try {
      const response = await apiCall(`/accounts/${userId}`, {
        method: "DELETE",
        authToken: session?.access_token,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = data.error || "Failed to delete account"
        throw new Error(errorMessage)
      }

      const now = new Date().toISOString()
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === userId
            ? { ...acc, is_active: false, deleted_at: now }
            : acc
        )
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
      throw err
    }
  }

  const hardDeleteAccount = async (userId: string) => {
    try {
      const response = await apiCall(`/accounts/${userId}/hard`, {
        method: "DELETE",
        authToken: session?.access_token,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = data.error || "Failed to permanently delete account"
        throw new Error(errorMessage)
      }

      setAccounts((prev) => prev.filter((acc) => acc.id !== userId))
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
      throw err
    }
  }

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!session?.access_token) {
      throw new Error("Authentication session not found. Please login again.")
    }

    try {
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

  useEffect(() => {
    fetchAccounts()
  }, [user])

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    updateAccount,
    deleteAccount,
    hardDeleteAccount,
    verifyPassword,
  }
}
