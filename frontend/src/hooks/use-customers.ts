/**
 * useCustomers Hook
 * =================
 *
 * Fetches customers from the customers table with optional search filtering.
 * Returns customers formatted for appointment selection.
 */

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Customer } from "@/types/customer"

interface UseCustomersOptions {
  /** Initial fetch limit (default: 50) */
  limit?: number
  /** Auto-fetch on mount */
  autoFetch?: boolean
}

interface UseCustomersReturn {
  customers: Customer[]
  loading: boolean
  error: string | null
  /** Search customers by name, email, or phone */
  search: (query: string) => Promise<void>
  /** Fetch all customers (up to limit) */
  fetchAll: () => Promise<void>
  /** Get a single customer by ID */
  getById: (id: string) => Promise<Customer | null>
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { limit = 50, autoFetch = true } = options

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true })
        .limit(limit)

      if (queryError) throw queryError
      setCustomers(data || [])
    } catch (err) {
      console.error("Error fetching customers:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch customers")
    } finally {
      setLoading(false)
    }
  }, [limit])

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchAll()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const searchTerm = `%${query.trim()}%`

      const { data, error: queryError } = await supabase
        .from("customers")
        .select("*")
        .or(
          `name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
        )
        .order("name", { ascending: true })
        .limit(limit)

      if (queryError) throw queryError
      setCustomers(data || [])
    } catch (err) {
      console.error("Error searching customers:", err)
      setError(err instanceof Error ? err.message : "Failed to search customers")
    } finally {
      setLoading(false)
    }
  }, [limit, fetchAll])

  const getById = useCallback(async (id: string): Promise<Customer | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single()

      if (queryError) throw queryError
      return data
    } catch (err) {
      console.error("Error fetching customer by ID:", err)
      return null
    }
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchAll()
    }
  }, [autoFetch, fetchAll])

  return { customers, loading, error, search, fetchAll, getById }
}
