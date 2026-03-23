import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  is_active?: boolean
  deleted_at?: string
}

interface UseBranchesReturn {
  branches: Branch[]
  deletedBranches: Branch[]
  loading: boolean
  error: string | null
  fetchAll: () => Promise<void>
  createBranch: (branch: Omit<Branch, "id" | "deleted_at">) => Promise<{ data: any; error: any }>
  updateBranch: (id: string, branch: Partial<Omit<Branch, "id" | "deleted_at">>) => Promise<{ data: any; error: any }>
  deleteBranch: (id: string) => Promise<{ error: any }>
  restoreBranch: (id: string) => Promise<{ error: any }>
  permanentlyDeleteBranch: (id: string) => Promise<{ error: any }>
}

export function useBranches(): UseBranchesReturn {
  const [branches, setBranches] = useState<Branch[]>([])
  const [deletedBranches, setDeletedBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: queryError } = await supabase
        .from("branches")
        .select("*")
        .order("name", { ascending: true })
      if (queryError) throw queryError
      
      const active = (data || []).filter(b => !b.deleted_at)
      const deleted = (data || []).filter(b => b.deleted_at)
      
      setBranches(active)
      setDeletedBranches(deleted)
    } catch (err) {
      console.error("Error fetching branches:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch branches")
    } finally {
      setLoading(false)
    }
  }, [])

  const createBranch = async (branch: Omit<Branch, "id" | "deleted_at">) => {
    try {
      const { data, error: insertError } = await supabase
        .from("branches")
        .insert([branch])
        .select()
      
      if (insertError) throw insertError
      
      await fetchAll()
      return { data, error: null }
    } catch (err) {
      console.error("Error creating branch:", err)
      return { data: null, error: err }
    }
  }

  const deleteBranch = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("branches")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)

      if (deleteError) throw deleteError

      await fetchAll()
      return { error: null }
    } catch (err) {
      console.error("Error deleting branch:", err)
      return { error: err }
    }
  }

  const restoreBranch = async (id: string) => {
    try {
      const { error: restoreError } = await supabase
        .from("branches")
        .update({ deleted_at: null })
        .eq("id", id)

      if (restoreError) throw restoreError

      await fetchAll()
      return { error: null }
    } catch (err) {
      console.error("Error restoring branch:", err)
      return { error: err }
    }
  }

  const permanentlyDeleteBranch = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("branches")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      await fetchAll()
      return { error: null }
    } catch (err) {
      console.error("Error permanently deleting branch:", err)
      return { error: err }
    }
  }

  const updateBranch = async (id: string, branchUpdates: Partial<Omit<Branch, "id" | "deleted_at">>) => {
    try {
      const { data, error: updateError } = await supabase
        .from("branches")
        .update(branchUpdates)
        .eq("id", id)
        .select()
      
      if (updateError) throw updateError
      
      await fetchAll()
      return { data, error: null }
    } catch (err) {
      console.error("Error updating branch:", err)
      return { data: null, error: err }
    }
  }

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { 
    branches, 
    deletedBranches, 
    loading, 
    error, 
    fetchAll, 
    createBranch, 
    updateBranch, 
    deleteBranch, 
    restoreBranch, 
    permanentlyDeleteBranch 
  }
}
