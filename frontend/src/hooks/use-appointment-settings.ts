/**
 * useAppointmentSettings Hook
 * ===========================
 *
 * Fetches and manages appointment settings from the database.
 * These settings are used across the calendar to apply global appointment rules
 * (working hours, lunch breaks, etc.) to all staff members.
 */

import { useEffect, useState, useCallback } from "react"
import { fetchAppointmentSettings, type AppointmentSettings } from "@/services/appointment-settings"

const DEFAULT_SETTINGS: AppointmentSettings = {
  default_duration: 60,
  buffer_time: 15,
  max_daily_appointments: 20,
  cancellation_notice: 24,
  enable_reschedule: true,
  enable_auto_reminder: true,
  working_hours_start: "09:00",
  working_hours_end: "18:00",
  lunch_break_start: "12:00",
  lunch_break_end: "13:00",
}

interface UseAppointmentSettingsReturn {
  settings: AppointmentSettings
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch and cache appointment settings from the database
 * Settings are shared globally across all staff
 */
export function useAppointmentSettings(): UseAppointmentSettingsReturn {
  const [settings, setSettings] = useState<AppointmentSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const dbSettings = await fetchAppointmentSettings()
      setSettings(dbSettings)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch settings"
      console.error("Error fetching appointment settings:", errorMsg)
      setError(errorMsg)
      // Keep default settings on error
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
  }
}
