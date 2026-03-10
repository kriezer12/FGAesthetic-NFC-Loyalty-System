import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

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
      const response = await fetch("/api/accounts/list", {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
      const response = await fetch(`/api/accounts/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
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
      const response = await fetch(`/api/accounts/${userId}`, {
        method: "DELETE",
        headers: {
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete account")
      }

      setAccounts((prev) => prev.filter((acc) => acc.id !== userId))
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
      throw err
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
  }
}
