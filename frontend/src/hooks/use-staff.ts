/**
 * useStaff Hook
 * =============
 *
 * Fetches all staff/employee members from the user_profiles table.
 * Includes all roles that should appear on the calendar (staff, admin, owner).
 * Returns staff formatted for the calendar StaffMember type.
 */

import { useEffect, useState } from "react"
import type { StaffMember } from "@/types/appointment"
import { STAFF_COLORS } from "@/components/features/calendar/calendar-parts/calendar-config"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"

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
  const { userProfile, session } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaff = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!session) {
        setStaff([])
        return
      }

      const response = await apiCall("/staff/list", {
        authToken: session.access_token,
      })

      if (!response.ok) {
        throw new Error("Failed to fetch staff")
      }

      const { staff: data } = await response.json()

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
    if (userProfile && session) {
      fetchStaff()
    }
  }, [userProfile, session])

  return { staff, loading, error, refetch: fetchStaff }
}
