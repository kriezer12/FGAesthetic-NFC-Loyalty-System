/**
 * useAppointments Hook
 * ====================
 *
 * Fetches and manages appointments from Supabase with real-time subscriptions.
 * Handles create, update, and delete operations.
 * Real-time sync ensures all clients see changes instantly.
 */

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { logUserAction } from "@/lib/user-log"
import type { Appointment } from "@/types/appointment"

interface UseAppointmentsReturn {
  appointments: Appointment[]
  loading: boolean
  error: string | null
  addAppointment: (appt: Appointment) => Promise<void>
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>
  deleteAppointment: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useAppointments(): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchAppointments = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from("appointments")
        .select("*")
        .order("start_time", { ascending: true })

      if (queryError) throw queryError

      setAppointments((data || []) as Appointment[])
    } catch (err) {
      console.error("Error fetching appointments:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch appointments")
      // Return empty array on error to allow app to continue
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const addAppointment = useCallback(async (appt: Appointment) => {
    try {
      const { error: insertError } = await supabase
        .from("appointments")
        .insert([appt])

      if (insertError) throw insertError

      // Update local state (realtime will also push, but this is instant)
      setAppointments((prev) => [...prev, appt])

      await logUserAction({
        actionType: "appointed_schedule",
        entityType: "appointment",
        entityId: appt.id,
        entityName: appt.customer_name || "Appointment",
        changes: { before: null, after: appt },
        metadata: {
          operation: "create",
          staff_id: appt.staff_id,
          staff_name: appt.staff_name,
          start_time: appt.start_time,
          end_time: appt.end_time,
        },
      })
    } catch (err) {
      console.error("Error adding appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to add appointment")
      throw err
    }
  }, [])

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    try {
      const existing = appointments.find((a) => a.id === id) || null

      const { error: updateError } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)

      if (updateError) throw updateError

      // Update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      )

      await logUserAction({
        actionType: "appointed_schedule",
        entityType: "appointment",
        entityId: id,
        entityName: existing?.customer_name || "Appointment",
        changes: { before: existing, after: existing ? { ...existing, ...updates } : updates },
        metadata: {
          operation: "update",
          updated_fields: Object.keys(updates),
        },
      })
    } catch (err) {
      console.error("Error updating appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to update appointment")
      throw err
    }
  }, [appointments])

  const deleteAppointment = useCallback(async (id: string) => {
    try {
      const existing = appointments.find((a) => a.id === id) || null

      const { error: deleteError } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      // Update local state
      setAppointments((prev) => prev.filter((a) => a.id !== id))

      await logUserAction({
        actionType: "appointed_schedule",
        entityType: "appointment",
        entityId: id,
        entityName: existing?.customer_name || "Appointment",
        changes: { before: existing, after: null },
        metadata: {
          operation: "delete",
          staff_id: existing?.staff_id,
          staff_name: existing?.staff_name,
          start_time: existing?.start_time,
          end_time: existing?.end_time,
        },
      })
    } catch (err) {
      console.error("Error deleting appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to delete appointment")
      throw err
    }
  }, [appointments])

  useEffect(() => {
    fetchAppointments()

    // Subscribe to real-time changes so all clients stay in sync
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAppt = payload.new as Appointment
            setAppointments((prev) => {
              // Avoid duplicates (we also update locally on insert)
              if (prev.some((a) => a.id === newAppt.id)) return prev
              return [...prev, newAppt]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Appointment
            setAppointments((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            )
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string }
            setAppointments((prev) => prev.filter((a) => a.id !== deleted.id))
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    refetch: fetchAppointments,
  }
}
