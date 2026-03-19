import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Equipment } from "@/types/equipment"

export function useEquipment() {
  const { userProfile } = useAuth()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEquipment = useCallback(async () => {
    if (!userProfile) return
    setLoading(true)
    try {
      let query = supabase
        .from("equipment")
        .select("*, branch:branches(name)")
        .order("name")

      if (userProfile.role !== "super_admin") {
        query = query.eq("branch_id", userProfile.branch_id)
      }

      const { data, error } = await query
      if (error) throw error
      setEquipment(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch equipment")
    } finally {
      setLoading(false)
    }
  }, [userProfile])

  const createEquipment = async (data: Omit<Equipment, "id" | "created_at" | "updated_at" | "branch">) => {
    try {
      const { data: newEquipment, error } = await supabase
        .from("equipment")
        .insert(data)
        .select("*, branch:branches(name)")
        .single()

      if (error) throw error
      setEquipment((prev) => [...prev, newEquipment])
      return newEquipment
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create equipment")
      throw err
    }
  }

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
    try {
      // Removing 'branch' from updates if it exists as it's a joined field
      const { branch, ...rest } = updates as any;
      const { data: updatedEquipment, error } = await supabase
        .from("equipment")
        .update(rest)
        .eq("id", id)
        .select("*, branch:branches(name)")
        .single()

      if (error) throw error
      setEquipment((prev) => prev.map((e) => (e.id === id ? updatedEquipment : e)))
      return updatedEquipment
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update equipment")
      throw err
    }
  }

  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase.from("equipment").delete().eq("id", id)
      if (error) throw error
      setEquipment((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete equipment")
      throw err
    }
  }

  useEffect(() => {
    if (userProfile) {
      fetchEquipment()
    }
  }, [userProfile, fetchEquipment])

  return {
    equipment,
    loading,
    error,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  }
}
