/**
 * Missed Notifications Context
 * ==============================
 * 
 * Tracks notifications that auto-dismissed without user interaction.
 * Provides state for the navbar bell icon badge counter and dropdown.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface MissedNotification {
  id: string
  title: string
  message: string
  timestamp: number
  type?: "info" | "warning" | "success"
}

interface MissedNotificationsContextType {
  missedNotifications: MissedNotification[]
  addMissedNotification: (notification: MissedNotification) => void
  removeMissedNotification: (id: string) => void
  clearAllMissedNotifications: () => void
}

const MissedNotificationsContext = createContext<MissedNotificationsContextType | undefined>(undefined)

export function MissedNotificationsProvider({ children }: { children: ReactNode }) {
  const [missedNotifications, setMissedNotifications] = useState<MissedNotification[]>([])

  const addMissedNotification = useCallback((notification: MissedNotification) => {
    setMissedNotifications((prev) => [...prev, notification])
  }, [])

  const removeMissedNotification = useCallback((id: string) => {
    setMissedNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAllMissedNotifications = useCallback(() => {
    setMissedNotifications([])
  }, [])

  return (
    <MissedNotificationsContext.Provider
      value={{
        missedNotifications,
        addMissedNotification,
        removeMissedNotification,
        clearAllMissedNotifications,
      }}
    >
      {children}
    </MissedNotificationsContext.Provider>
  )
}

export function useMissedNotifications() {
  const ctx = useContext(MissedNotificationsContext)
  if (!ctx) {
    throw new Error("useMissedNotifications must be used within a MissedNotificationsProvider")
  }
  return ctx
}
