/**
 * useStaff Hook
 * =============
 *
 * Fetches all staff/employee members from the user_profiles table.
 * Includes all roles that should appear on the calendar (staff, admin, owner).
 * Returns staff formatted for the calendar StaffMember type.
 */

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import type { StaffMember } from "@/types/appointment"
import { STAFF_COLORS } from "@/components/features/calendar/calendar-parts/calendar-config"

/** Roles that should appear as bookable staff on the calendar. */
const CALENDAR_ROLES = ["super_admin", "branch_admin", "staff"]

interface UserProfile {
  id: string
  full_name: string | null
  role: string | null
  avatar_url: string | null
}

interface UseStaffReturn {
  staff: StaffMember[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStaff(): UseStaffReturn {
  const { userProfile } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaff = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from("user_profiles")
        .select("id, full_name, role, avatar_url")
        .in("role", CALENDAR_ROLES)
        .order("full_name", { ascending: true })

      // Filter by branch if user is branch_admin or staff
      if (
        (userProfile?.role === "branch_admin" || userProfile?.role === "staff") &&
        userProfile.branch_id
      ) {
        query = query.eq("branch_id", userProfile.branch_id)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const staffMembers: StaffMember[] = (data || []).map(
        (profile: UserProfile, index: number) => ({
          id: profile.id,
          name: profile.full_name || "Unknown Staff",
          role: profile.role || "Staff",
          color: STAFF_COLORS[index % STAFF_COLORS.length],
        })
      )

      setStaff(staffMembers)
    } catch (err) {
      console.error("Error fetching staff:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch staff")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile) {
      fetchStaff()
    }
  }, [userProfile])

  return { staff, loading, error, refetch: fetchStaff }
}
