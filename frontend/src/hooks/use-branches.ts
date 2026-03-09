import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  is_active?: boolean
}

interface UseBranchesReturn {
  branches: Branch[]
  loading: boolean
  error: string | null
  fetchAll: () => Promise<void>
}

export function useBranches(): UseBranchesReturn {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: queryError } = await supabase
        .from("branches")
        .select("id,name")
        .order("name", { ascending: true })
      if (queryError) throw queryError
      setBranches(data || [])
    } catch (err) {
      console.error("Error fetching branches:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch branches")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { branches, loading, error, fetchAll }
}
