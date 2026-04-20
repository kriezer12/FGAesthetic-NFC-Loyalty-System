/**
 * useCheckedOutAppointments Hook
 * ==============================
 *
 * Fetches a set of appointment IDs that have been transacted/billed.
 * Used to determine which appointments are eligible for "Proceed to Checkout".
 */

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useCheckedOutAppointments(): {
  checkedOutAppointmentIds: Set<string>
  loading: boolean
  error: string | null
} {
  const [checkedOutAppointmentIds, setCheckedOutAppointmentIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCheckedOutAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: supabaseError } = await supabase
        .from("transactions")
        .select("appointment_id")
        .not("appointment_id", "is", null)
        .limit(5000)

      if (supabaseError) throw supabaseError

      const ids = new Set(
        (data || [])
          .map((row: { appointment_id?: string | null }) => row.appointment_id)
          .filter(Boolean) as string[]
      )
      
      setCheckedOutAppointmentIds(ids)
    } catch (err) {
      console.error("[useCheckedOutAppointments] Error fetching checked-out appointments:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch checked-out appointments")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCheckedOutAppointments()
  }, [fetchCheckedOutAppointments])

  return { checkedOutAppointmentIds, loading, error }
}
