/**
 * Notification Settings Context
 * ==============================
 * 
 * Provides configurable appointment notification intervals.
 * Settings persist in localStorage so they survive page reloads.
 * 
 * Usage:
 *   import { useNotificationSettings } from '@/contexts/notification-settings-context'
 *   const { firstAlert, secondAlert, updateSettings } = useNotificationSettings()
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

const STORAGE_KEY = "notification-settings"

export const AVAILABLE_INTERVALS = [5, 10, 15, 20, 30, 45, 60] as const

export interface NotificationSettings {
  firstAlert: {
    enabled: boolean
    minutes: number
  }
  secondAlert: {
    enabled: boolean
    minutes: number
  }
}

const DEFAULT_SETTINGS: NotificationSettings = {
  firstAlert: { enabled: true, minutes: 30 },
  secondAlert: { enabled: true, minutes: 15 },
}

interface NotificationSettingsContextType {
  settings: NotificationSettings
  updateSettings: (settings: NotificationSettings) => void
}

function loadSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        firstAlert: {
          enabled: parsed.firstAlert?.enabled ?? DEFAULT_SETTINGS.firstAlert.enabled,
          minutes: parsed.firstAlert?.minutes ?? DEFAULT_SETTINGS.firstAlert.minutes,
        },
        secondAlert: {
          enabled: parsed.secondAlert?.enabled ?? DEFAULT_SETTINGS.secondAlert.enabled,
          minutes: parsed.secondAlert?.minutes ?? DEFAULT_SETTINGS.secondAlert.minutes,
        },
      }
    }
  } catch {
    // Corrupted localStorage — fall back to defaults
  }
  return DEFAULT_SETTINGS
}

const NotificationSettingsContext = createContext<NotificationSettingsContextType | undefined>(undefined)

export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings)

  const updateSettings = useCallback((next: NotificationSettings) => {
    setSettings(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage full or unavailable — settings still work in-memory
    }
  }, [])

  return (
    <NotificationSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </NotificationSettingsContext.Provider>
  )
}

export function useNotificationSettings() {
  const ctx = useContext(NotificationSettingsContext)
  if (!ctx) {
    throw new Error("useNotificationSettings must be used within a NotificationSettingsProvider")
  }
  return ctx
}
