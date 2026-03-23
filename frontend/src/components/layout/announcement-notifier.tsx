import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { NotificationToast } from "@/components/ui/notification-toast"
import { useMissedNotifications } from "@/contexts/missed-notifications-context"

interface AnnouncementToast {
  id: string
  message: string
  created_at: string
}

export function AnnouncementNotifier() {
  const { addMissedNotification } = useMissedNotifications()
  const [activeToasts, setActiveToasts] = useState<AnnouncementToast[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const initialLoadDone = useRef(false)

  const removeToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleAutoDismiss = useCallback((id: string) => {
    setActiveToasts((prev) => {
      const toast = prev.find((a) => a.id === id)
      if (toast) {
        addMissedNotification({
          id: toast.id,
          title: "System Announcement",
          message: toast.message,
          timestamp: new Date(toast.created_at).getTime(),
          type: "info",
        })
      }
      return prev.filter((a) => a.id !== id)
    })
  }, [addMissedNotification])

  const showToast = useCallback((announcement: AnnouncementToast) => {
    if (!seenRef.current.has(announcement.id)) {
      seenRef.current.add(announcement.id)
      persistSeen()
      setActiveToasts((prev) => [...prev, announcement])
    }
  }, [])

  const persistSeen = () => {
    localStorage.setItem(
      "announcement_seen_ids",
      JSON.stringify([...seenRef.current])
    )
  }

  // Load seen IDs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("announcement_seen_ids")
    if (saved) {
      try {
        const ids: string[] = JSON.parse(saved)
        ids.forEach((id) => seenRef.current.add(id))
      } catch { /* ignore */ }
    }
  }, [])

  // Initial fetch: mark existing as seen (no toast on page load)
  // Then start polling every 10s for new announcements
  useEffect(() => {
    const fetchAndProcess = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, message, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (!data) return

      if (!initialLoadDone.current) {
        // First load: mark all existing as seen silently
        data.forEach((a) => seenRef.current.add(a.id))
        persistSeen()
        initialLoadDone.current = true
      } else {
        // Subsequent polls: toast any new unseen announcements
        data.forEach((a) => {
          if (!seenRef.current.has(a.id)) {
            showToast(a)
          }
        })
      }
    }

    // Initial fetch
    fetchAndProcess()

    // Poll every 10 seconds as primary mechanism
    const pollInterval = setInterval(fetchAndProcess, 10000)

    // Also try real-time as bonus (may not work if realtime not enabled)
    const channel = supabase
      .channel("announcement_toasts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "announcements",
        },
        (payload) => {
          const newAnnouncement = payload.new as AnnouncementToast & { is_active: boolean }
          if (newAnnouncement.is_active) {
            showToast(newAnnouncement)
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [showToast])

  if (activeToasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col items-end gap-3"
      style={{ maxWidth: 400 }}
    >
      {activeToasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          id={toast.id}
          title="📢 System Announcement"
          message={toast.message}
          onClose={removeToast}
          onAutoDismiss={handleAutoDismiss}
          type="info"
        />
      ))}
    </div>
  )
}
