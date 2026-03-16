import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export interface Announcement {
  id: string
  message: string
  role_target: string
  created_by: string
  created_at: string
  is_active: boolean
}

export function useAnnouncements() {
  const { userProfile } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (err: any) {
      console.error("Error fetching announcements:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createAnnouncement = async (message: string, roleTarget: string = "staff") => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert([
          {
            message,
            role_target: roleTarget,
            created_by: userProfile?.id,
          },
        ])
        .select()

      if (error) throw error
      return { data, error: null }
    } catch (err: any) {
      console.error("Error creating announcement:", err)
      return { data: null, error: err.message }
    }
  }

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: false })
        .eq("id", id)

      if (error) throw error
      return { error: null }
    } catch (err: any) {
      console.error("Error deleting announcement:", err)
      return { error: err.message }
    }
  }

  useEffect(() => {
    fetchAnnouncements()

    // Real-time subscription
    const channel = supabase
      .channel("announcements_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAnnouncement = payload.new as Announcement
            if (newAnnouncement.is_active) {
              setAnnouncements((prev) => [newAnnouncement, ...prev])
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Announcement
            if (!updated.is_active) {
              setAnnouncements((prev) => prev.filter((a) => a.id !== updated.id))
            } else {
              setAnnouncements((prev) =>
                prev.map((a) => (a.id === updated.id ? updated : a))
              )
            }
          } else if (payload.eventType === "DELETE") {
            setAnnouncements((prev) => prev.filter((a) => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAnnouncements])

  return {
    announcements,
    loading,
    error,
    createAnnouncement,
    deleteAnnouncement,
    refresh: fetchAnnouncements,
  }
}
