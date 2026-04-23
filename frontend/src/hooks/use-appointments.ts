/**
 * useAppointments Hook
 * ====================
 *
 * Fetches and manages appointments from Supabase with real-time subscriptions.
 * Handles create, update, and delete operations.
 * Real-time sync ensures all clients see changes instantly.
 *
 * Role-based restrictions:
 * - Only staff members can create or edit appointments
 * - Staff and admins can delete appointments
 * - Admins can view all appointments (read-only, no create/edit)
 */

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
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

export function useAppointments(branchId?: string, rangeStart?: string, rangeEnd?: string): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ---- role-based access control ----
  const { userProfile, loading: authLoading } = useAuth()
  const isStaff = userProfile?.role === "staff"
  const isAdmin = userProfile?.role === "super_admin" || userProfile?.role === "branch_admin"
  const canCreateOrEdit = isStaff || isAdmin
  const canDelete = isStaff || isAdmin

  const fetchAppointments = useCallback(async () => {
    // Only fetch if we have a user profile (except for public views if any)
    if (!userProfile?.id) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from("appointments")
        .select("*")
        .order("start_time", { ascending: true })

      // Filter by date range if provided - CRITICAL for performance
      if (rangeStart) {
        query = query.gte('start_time', rangeStart)
      }
      if (rangeEnd) {
        query = query.lte('start_time', rangeEnd)
      }

      // Filter logic:
      // 1. Staff: See ONLY their own appointments, but across ANY branch.
      // 2. Branch Admin: See all appointments in their branch.
      // 3. Super Admin: See all appointments (filtered by branchId if provided).
      
      if (isStaff) {
        // Staff should see their schedule regardless of which branch they are currently viewing.
        // This fixes the "disappearing cross-branch appointments" issue.
        query = query.eq('staff_id', userProfile.id)
      } else if (userProfile?.role === "branch_admin") {
        // Branch admins see everything in their home branch.
        // (They might also see "borrowed" staff appointments if they are in their branch).
        query = query.eq('branch_id', userProfile.branch_id)
      } else if (userProfile?.role === "super_admin") {
        // Super admins can filter by branch if they want.
        if (branchId) {
          query = query.eq('branch_id', branchId)
        }
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setAppointments((data || []) as Appointment[])
    } catch (err) {
      console.error("Error fetching appointments:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch appointments")
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [isStaff, userProfile?.id, userProfile?.role, userProfile?.branch_id, branchId, rangeStart, rangeEnd])

  const addAppointment = useCallback(async (appt: Appointment) => {
    // Role-based access control: staff and admins can create appointments
    if (!canCreateOrEdit) {
      const error = new Error("Unauthorized: Only staff members and admins can create appointments")
      console.error(error.message)
      setError(error.message)
      throw error
    }

    try {
      const payload: Appointment = {
        ...appt,
        branch_id: appt.branch_id || userProfile?.branch_id || undefined,
      }

      if (!payload.branch_id) {
        throw new Error("Unable to save appointment: missing branch ownership.")
      }

      const { error: insertError } = await supabase
        .from("appointments")
        .insert([payload])

      if (insertError) throw insertError

      // Update local state (realtime will also push, but this is instant)
      setAppointments((prev) => [...prev, payload])

      await logUserAction({
        actionType: "appointed_schedule",
        entityType: "appointment",
        entityId: payload.id,
        entityName: payload.customer_name || "Appointment",
        changes: { before: null, after: payload },
        metadata: {
          operation: "create",
          staff_id: payload.staff_id,
          staff_name: payload.staff_name,
          start_time: payload.start_time,
          end_time: payload.end_time,
          branch_id: payload.branch_id,
        },
      })
    } catch (err) {
      console.error("Error adding appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to add appointment")
      throw err
    }
  }, [canCreateOrEdit, userProfile?.branch_id])

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    // Role-based access control: staff and admins can edit appointments
    if (!canCreateOrEdit) {
      const error = new Error("Unauthorized: Only staff members and admins can edit appointments")
      console.error(error.message)
      setError(error.message)
      throw error
    }

    try {
      const existing = appointments.find((a) => a.id === id) || null

      if (
        isStaff &&
        (
          !existing?.branch_id ||
          !userProfile?.branch_id ||
          existing.branch_id !== userProfile.branch_id
        )
      ) {
        throw new Error("You can only modify appointments that belong to your home branch.")
      }

      // Keep branch ownership immutable once set.
      const sanitizedUpdates: Partial<Appointment> = { ...updates }
      if (existing?.branch_id) {
        sanitizedUpdates.branch_id = existing.branch_id
      } else {
        sanitizedUpdates.branch_id = updates.branch_id || userProfile?.branch_id || undefined
      }

      if (!sanitizedUpdates.branch_id) {
        throw new Error("Unable to update appointment: missing branch ownership.")
      }

      const { error: updateError } = await supabase
        .from("appointments")
        .update(sanitizedUpdates)
        .eq("id", id)

      if (updateError) throw updateError

      // Update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...sanitizedUpdates } : a))
      )

      await logUserAction({
        actionType: "appointed_schedule",
        entityType: "appointment",
        entityId: id,
        entityName: existing?.customer_name || "Appointment",
        changes: { before: existing, after: existing ? { ...existing, ...sanitizedUpdates } : sanitizedUpdates },
        metadata: {
          operation: "update",
          updated_fields: Object.keys(sanitizedUpdates),
        },
      })
    } catch (err) {
      console.error("Error updating appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to update appointment")
      throw err
    }
  }, [appointments, canCreateOrEdit, isStaff, userProfile?.branch_id])

  const deleteAppointment = useCallback(async (id: string) => {
    // Role-based access control: staff and admins can delete appointments
    if (!canDelete) {
      const error = new Error("Unauthorized: Only staff and admins can delete appointments")
      console.error(error.message)
      setError(error.message)
      throw error
    }

    try {
      const existing = appointments.find((a) => a.id === id) || null

      if (
        isStaff &&
        (
          !existing?.branch_id ||
          !userProfile?.branch_id ||
          existing.branch_id !== userProfile.branch_id
        )
      ) {
        throw new Error("You can only delete appointments that belong to your home branch.")
      }

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
  }, [appointments, canDelete, isStaff, userProfile?.branch_id])

  useEffect(() => {
    // Return early if auth state is still loading
    if (authLoading) return;
    
    // If the user is staff, we need their ID to fetch ONLY their own appointments.
    // Return early if the user profile hasn't loaded yet.
    if (isStaff && !userProfile?.id) return;

    fetchAppointments()

    // Subscribe to real-time changes so all clients stay in sync
    const channelName = isStaff ? `appointments-realtime-staff-${userProfile?.id}` : "appointments-realtime"
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAppt = payload.new as Appointment
            
            // Filtering logic for real-time matches the fetchAppointments logic:
            if (isStaff) {
              if (newAppt.staff_id !== userProfile?.id) return;
            } else if (userProfile?.role === "branch_admin") {
              if (newAppt.branch_id !== userProfile.branch_id) return;
            } else if (userProfile?.role === "super_admin") {
              if (branchId && newAppt.branch_id !== branchId) return;
            }
            
            setAppointments((prev) => {
              // Avoid duplicates (we also update locally on insert)
              if (prev.some((a) => a.id === newAppt.id)) return prev
              return [...prev, newAppt]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Appointment
            
            if (isStaff) {
              if (updated.staff_id !== userProfile?.id) {
                setAppointments((prev) => prev.filter((a) => a.id !== updated.id))
                return;
              }
            } else if (userProfile?.role === "branch_admin") {
              if (updated.branch_id !== userProfile.branch_id) {
                setAppointments((prev) => prev.filter((a) => a.id !== updated.id))
                return;
              }
            } else if (userProfile?.role === "super_admin") {
              if (branchId && updated.branch_id !== branchId) {
                setAppointments((prev) => prev.filter((a) => a.id !== updated.id))
                return;
              }
            }
            
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
  }, [authLoading, fetchAppointments, isStaff, userProfile?.branch_id, userProfile?.id, userProfile?.role, branchId])

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
