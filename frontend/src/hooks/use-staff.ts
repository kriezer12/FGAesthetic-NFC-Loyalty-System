/**
 * useStaff Hook
 * =============
 *
 * Fetches all staff/employee members from the user_profiles table.
 * Includes all roles that should appear on the calendar (staff, admin, owner).
 * Returns staff formatted for the calendar StaffMember type.
 */

import { useCallback, useEffect, useState } from "react"
import type { StaffMember } from "@/types/appointment"
import { STAFF_COLORS } from "@/components/features/calendar/calendar-parts/calendar-config"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"

interface UserProfile {
  id: string
  full_name: string | null
  role: string | null
  avatar_url: string | null
  branch_id?: string | null
  is_temporary_assignment?: boolean
  home_branch_name?: string | null
  host_branch_name?: string | null
}

interface UseStaffReturn {
  staff: StaffMember[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseStaffOptions {
  rangeStart?: string
  rangeEnd?: string
}

export function useStaff(options: UseStaffOptions = {}): UseStaffReturn {
  const { userProfile, session } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (!session) {
        setStaff([])
        return
      }

      const params = new URLSearchParams()
      if (options.rangeStart) params.set("range_start", options.rangeStart)
      if (options.rangeEnd) params.set("range_end", options.rangeEnd)

      const response = await apiCall(`/staff/list${params.toString() ? `?${params.toString()}` : ""}`, {
        authToken: session.access_token,
      })

      if (!response.ok) {
        throw new Error("Failed to fetch staff")
      }

      const { staff: data } = await response.json()

      const staffMembers: StaffMember[] = (data || []).map(
        (profile: UserProfile, index: number) => {
          // Only branch admins need to see cross-branch origin context.
          // Staff users should see a neutral status label.
          const showTemporaryOrigin =
            userProfile?.role === "branch_admin" && Boolean(profile.is_temporary_assignment)

          const roleLabel = showTemporaryOrigin
            ? `Temporary from ${profile.home_branch_name || "Other Branch"}`
            : profile.is_temporary_assignment
              ? `Staff - Active Branches: ${profile.home_branch_name || "Home Branch"} + ${profile.host_branch_name || "Assigned Branch"}`
              : (profile.role || "Staff")

          return {
            id: profile.id,
            name: profile.full_name || "Unknown Staff",
            role: roleLabel,
            branch_id: profile.branch_id || undefined,
            color: STAFF_COLORS[index % STAFF_COLORS.length],
          }
        }
      )

      setStaff(staffMembers)
    } catch (err) {
      console.error("Error fetching staff:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch staff")
    } finally {
      setLoading(false)
    }
  }, [options.rangeEnd, options.rangeStart, session, userProfile?.role])

  useEffect(() => {
    if (userProfile && session) {
      void fetchStaff()
    }
  }, [userProfile, session, fetchStaff])

  return { staff, loading, error, refetch: fetchStaff }
}
