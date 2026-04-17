/**
 * Calendar View
 * =============
 *
 * Top-level orchestrator for the appointment calendar feature.
 * Owns all state (date, interval, appointments, dialog) and wires the
 * header, grid and dialog sub-components together.
 */

import { useCallback, useState, useEffect, useMemo, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { NotificationToast } from "@/components/ui/notification-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { PasswordVerificationDialog } from "@/components/auth/password-verification-dialog"
import { usePasswordVerification } from "@/hooks/use-password-verification"
import type { Appointment, IntervalMinutes, StaffMember, ViewMode } from "@/types/appointment"
import type { Service } from "@/types/service"
import {
  DEFAULT_INTERVAL,
} from "./calendar-parts/calendar-config"
import { startOfWeek, addDays } from "date-fns"
import { generateId, setTimeOnDate } from "./calendar-parts/calendar-utils"
import { useStaff } from "@/hooks/use-staff"
import { useAppointments } from "@/hooks/use-appointments"
import { useAppointmentSettings } from "@/hooks/use-appointment-settings"
import { saveAppointmentSettings } from "@/services/appointment-settings"
import { CalendarHeader } from "./calendar-parts/calendar-header"
import { CalendarGrid } from "./calendar-parts/calendar-grid"
import { CalendarWeekGrid } from "./calendar-parts/calendar-week-grid"
import { CalendarMonthGrid } from "./calendar-parts/calendar-month-grid"
import { AppointmentDialog } from "./calendar-parts/appointment-dialog"
import { CalendarSettingsDialog, type CalendarSettings } from "./calendar-parts/calendar-settings-dialog"
import {
  RecurrenceActionDialog,
  type RecurrenceActionScope,
  type RecurrenceActionType,
} from "./calendar-parts/recurrence-action-dialog"
import { deductInventoryForAppointment } from "./calendar-parts/inventory-utils"
import { AppointmentsTableView } from "./appointments-table-view"

// ---- default settings ----
const DEFAULT_SETTINGS: CalendarSettings = {
  workHoursStart: "09:00",
  workHoursEnd: "18:00",
  lunchBreakStart: "12:00",
  lunchBreakEnd: "13:00",
  selectedStaff: [],
  snapColumnsToFit: true,
}

/** Parse "HH:MM" → hour number (0-23) */
function parseHour(timeStr: string | undefined, fallback: number): number {
  if (!timeStr) return fallback
  const h = parseInt(timeStr.split(":")[0], 10)
  return isNaN(h) ? fallback : h
}

/** Load settings from Supabase or return defaults */
async function loadSettings(): Promise<CalendarSettings> {
  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select("calendar_settings")
      .eq("id", "default") // Use 'default' ID that POS uses
      .maybeSingle()
    
    if (error) {
      console.warn("Failed to load calendar settings:", error.message)
      return DEFAULT_SETTINGS
    }
    
    if (!data?.calendar_settings) {
      console.info("No calendar settings found, using defaults")
      return DEFAULT_SETTINGS
    }
    
    try {
      const parsed = JSON.parse(data.calendar_settings)
      return { ...DEFAULT_SETTINGS, ...parsed }
    } catch (parseErr) {
      console.error("Failed to parse calendar settings JSON:", parseErr)
      return DEFAULT_SETTINGS
    }
  } catch (err) {
    console.error("Failed to load calendar settings:", err)
    return DEFAULT_SETTINGS
  }
}

/** Save settings to Supabase for global sync */
async function saveSettings(settings: CalendarSettings): Promise<void> {
  try {
    // Use the default business_settings record that POS also uses
    const { error: updateError } = await supabase
      .from("business_settings")
      .update({ calendar_settings: JSON.stringify(settings) })
      .eq("id", "default")
    
    if (updateError) throw updateError
  } catch (err) {
    console.error("Failed to save calendar settings:", err)
    throw err
  }
}

/** Get day-of-week string from Date (MON, TUE, etc.) */
function getDayOfWeek(date: Date): string {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  return days[date.getDay()]
}

export function CalendarView() {
  // ---- auth state ----
  const { userProfile } = useAuth()
  const isStaff = userProfile?.role === "staff"
  const isAdmin = userProfile?.role === "super_admin" || userProfile?.role === "branch_admin"
  const canManageAppointments = isStaff || isAdmin
  
  // ---- core state ----
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [interval, setIntervalMinutes]  = useState<IntervalMinutes>(DEFAULT_INTERVAL)
  const [viewMode, setViewMode]         = useState<ViewMode>("day")
  const [showTableView, setShowTableView] = useState(false)
  const [toast, setToast] = useState<{ id: string; title: string; message: string; type: "warning" | "success" } | null>(null)
  
  // ---- appointment reminder state ----
  const [reminderToast, setReminderToast] = useState<{ id: string; appointment: Appointment } | null>(null)
  const notifiedAppointmentsRef = useRef<Set<string>>(new Set())
  
  // Fetch appointments from Supabase
  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment } = useAppointments()

  // Load appointment settings from database (shared across all staff)
  const { settings: appointmentSettings, loading: settingsLoading, refetch: refetchSettings } = useAppointmentSettings()

  // Load services so we can derive titles for follow-up appointments
  const [services, setServices] = useState<Service[]>([])
  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])

  const loadServices = useCallback(async () => {
    const { data } = await supabase.from("services").select("*")
    setServices((data || []) as Service[])
    return (data || []) as Service[]
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])
  
  // Merge appointment settings from database with calendar-specific settings
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    loadSettings().then(settings => {
      setCalendarSettings(settings)
    })
  }, [])

  // Update calendar settings when appointment settings change
  useEffect(() => {
    if (!settingsLoading && appointmentSettings) {
      setCalendarSettings((prev) => ({
        ...prev,
        workHoursStart: appointmentSettings.working_hours_start,
        workHoursEnd: appointmentSettings.working_hours_end,
        lunchBreakStart: appointmentSettings.lunch_break_start,
        lunchBreakEnd: appointmentSettings.lunch_break_end,
      }))
    }
  }, [appointmentSettings, settingsLoading])

  // Fetch real staff from database
  const { staff: allStaff = [] } = useStaff()
  
  // Initialize selectedStaff with all staff on first load
  useEffect(() => {
    if (
      allStaff.length > 0 &&
      (!calendarSettings.selectedStaff || calendarSettings.selectedStaff.length === 0)
    ) {
      setCalendarSettings((prev) => ({
        ...prev,
        selectedStaff: allStaff.map((s) => s.id),
      }))
    }
  }, [allStaff])
  
  // Filter staff based on selected staff in settings AND working days
  const dayOfWeek = getDayOfWeek(selectedDate)
  const staff = allStaff.filter((s: StaffMember) => {
    // Must be in the selected staff list
    if (!calendarSettings.selectedStaff?.includes(s.id)) return false
    // Must be working on the selected day (if schedules configured)
    if (calendarSettings.staffSchedules?.[s.id]) {
      return calendarSettings.staffSchedules[s.id].includes(dayOfWeek as any)
    }
    // If no schedule configured, show by default
    return true
  })
  
  let blockedTimes: any[] = []

  // Derive clinic hours from settings (work hours)
  const clinicHours = useMemo(() => ({
    open: parseHour(calendarSettings.workHoursStart, 9),
    close: parseHour(calendarSettings.workHoursEnd, 18),
  }), [calendarSettings.workHoursStart, calendarSettings.workHoursEnd])

  // ---- settings state ----
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  // ---- password verification state ----
  const [showPasswordVerification, setShowPasswordVerification] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingRecurrenceDelete, setPendingRecurrenceDelete] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const { verifyPassword } = usePasswordVerification()

  // Build the list of dates that need lunch-break blocked times.
  // Day view = just selectedDate; week view = all 7 days of the week.
  const lunchDates = useMemo(() => {
    if (viewMode === "week") {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 1 })
      return Array.from({ length: 7 }, (_, i) => addDays(ws, i))
    }
    return [selectedDate]
  }, [viewMode, selectedDate])

  // Add lunch break to blocked times if configured
  if (calendarSettings.lunchBreakStart && calendarSettings.lunchBreakEnd) {
    const [lunchHour, lunchMin] = calendarSettings.lunchBreakStart.split(":").map(Number)
    const [endHour, endMin] = calendarSettings.lunchBreakEnd.split(":").map(Number)

    for (const date of lunchDates) {
      const lunchStart = new Date(date)
      lunchStart.setHours(lunchHour, lunchMin, 0, 0)
      const lunchEnd = new Date(date)
      lunchEnd.setHours(endHour, endMin, 0, 0)
      const dateKey = date.toISOString().split("T")[0]

      // Add lunch break for all staff on this date
      staff.forEach((s: StaffMember) => {
        const id = `lunch-${s.id}-${dateKey}`
        if (!blockedTimes.some((b) => b.id === id)) {
          blockedTimes = [
            ...blockedTimes,
            {
              id,
              staff_id: s.id,
              start_time: lunchStart.toISOString(),
              end_time: lunchEnd.toISOString(),
              reason: "Lunch Break",
            },
          ]
        }
      })
    }
  }

  // ---- dialog state ----
  const [dialogOpen, setDialogOpen]             = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [prefillStaffId, setPrefillStaffId]     = useState<string | undefined>()
  const [prefillStartMin, setPrefillStartMin]   = useState<number | undefined>()

  const location = useLocation()
  const navigate = useNavigate()
  const processedAppointmentIdRef = useRef<string | null>(null)
  const [requestedAppointmentId, setRequestedAppointmentId] = useState<string | null>(null)

  const cleanupRadixOverlays = () => {
    if (typeof document === "undefined") return
    const selectors = [
      "[data-radix-dialog-overlay]",
      "[data-radix-context-menu-overlay]",
      "[data-radix-popover-overlay]",
      "[data-radix-dropdown-menu-overlay]",
    ]
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.remove())
    })
    document.body.style.pointerEvents = ""
    document.body.style.overflow = ""
  }

  useEffect(() => {
    const appointmentId = (location.state as any)?.appointmentId
    if (!appointmentId) return

    setRequestedAppointmentId((prev) => (prev === appointmentId ? prev : appointmentId))
  }, [location.state])

  useEffect(() => {
    if (appointmentsLoading || !requestedAppointmentId) return
    if (processedAppointmentIdRef.current === requestedAppointmentId) return

    const match = appointments.find((a) => a.id === requestedAppointmentId)
    if (!match) return

    setSelectedDate(new Date(match.start_time))
    setEditingAppointment(match)
    setDialogOpen(true)
    processedAppointmentIdRef.current = requestedAppointmentId
    setRequestedAppointmentId(null)

    // Clear navigation state so closing the dialog doesn't re-open it.
    navigate(location.pathname, { replace: true, state: null })
  }, [appointmentsLoading, requestedAppointmentId, appointments, navigate, location.pathname])

  // ---- recurrence action dialog state ----
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false)
  const [recurrenceActionType, setRecurrenceActionType] = useState<RecurrenceActionType>("delete")
  const [recurrenceTarget, setRecurrenceTarget] = useState<Appointment | null>(null)

  // ---- password verification for deletion ----

  /** Get all appointments belonging to the same recurrence series. */
  const getSeriesAppointments = useCallback(
    (appt: Appointment) => {
      if (!appt.recurrence_group_id) return [appt]
      return appointments
        .filter((a) => a.recurrence_group_id === appt.recurrence_group_id)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    },
    [appointments],
  )

  // ---- CRUD callbacks ----

  /** Inline update (drag / resize). */
  const handleAppointmentUpdate = useCallback(
    async (id: string, updates: Partial<Appointment>) => {
      const oldAppt = appointments.find((a) => a.id === id)
      
      try {
        await updateAppointment(id, {
          ...updates,
          updated_at: new Date().toISOString(),
        })

        // If status changed to completed, award points
        if (updates.status === "completed" && oldAppt?.status !== "completed") {
          const updatedAppt = { ...oldAppt, ...updates } as Appointment
          await Promise.all([
            deductInventoryForAppointment(updatedAppt)
          ])
        }
      } catch (err) {
        console.error("Failed to update appointment:", err)
      }
    },
    [updateAppointment, appointments],
  )

  /** Save from dialog (create or edit). */
  const addDaysToIso = (iso: string, days: number) => {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString()
  }

  const handleSave = useCallback(async (appt: Appointment): Promise<void> => {
    const oldAppt = appointments.find((a) => a.id === appt.id)
    const isNew = !oldAppt

    if (isNew) {
      // if recurrence requested, add sequence
      if (appt.recurrence_days && appt.recurrence_count && appt.recurrence_count > 1) {
        const groupId = appt.recurrence_group_id || generateId()

        // Ensure we have service metadata to generate follow-up titles, otherwise fall back safely
        let localServiceMap = serviceMap
        if (localServiceMap.size === 0) {
          const loaded = await loadServices()
          localServiceMap = new Map((loaded || []).map((s) => [s.id, s]))
        }

        const packageServiceIds = (appt.service_ids || []).filter((id) =>
          localServiceMap.get(id)?.is_package,
        )
        const packageTitle = packageServiceIds
          .map((id) => localServiceMap.get(id)?.name)
          .filter(Boolean)
          .join(", ")

        let current: Appointment = { ...appt, recurrence_group_id: groupId }
        // first appointment uses whatever type user chose
        await addAppointment(current)
        for (let i = 1; i < appt.recurrence_count; i++) {
          const next: Appointment = {
            ...current,
            id: generateId(),
            recurrence_group_id: groupId,
            start_time: addDaysToIso(current.start_time, appt.recurrence_days),
            end_time: addDaysToIso(current.end_time, appt.recurrence_days),
            appointment_type: "followup", // force followups after the first session
            title: packageTitle || current.title,
            service_ids: packageServiceIds.length > 0 ? packageServiceIds : undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          await addAppointment(next)
          current = next
        }
      } else {
        await addAppointment(appt)
      }
    } else {
      await updateAppointment(appt.id, appt)
      
      // If status changed to completed, deduct inventory
      if (appt.status === "completed" && oldAppt?.status !== "completed") {
        await Promise.all([
          deductInventoryForAppointment(appt)
        ])
      }
    }
    // Dialog closes itself on success; errors propagate back to the dialog
  }, [appointments, addAppointment, updateAppointment])

  /** Delete from dialog. */
  const handleDelete = useCallback(async (id: string) => {
    // Permission check will happen in deleteAppointment from hook
    const appt = appointments.find((a) => a.id === id)
    // If it's part of a recurrence series, show the recurrence action dialog
    if (appt?.recurrence_group_id) {
      const series = getSeriesAppointments(appt)
      if (series.length > 1) {
        setRecurrenceTarget(appt)
        setRecurrenceActionType("delete")
        setRecurrenceDialogOpen(true)
        return
      }
    }
    // Single appointment — show password verification
    setPendingDeleteId(id)
    setPendingRecurrenceDelete(false)
    setShowPasswordVerification(true)
  }, [appointments, getSeriesAppointments])

  /** Handle password verification for deletion */
  const handlePasswordVerified = useCallback(async (password: string) => {
    setIsVerifying(true)
    setVerificationError(null)
    try {
      await verifyPassword(password)
      // Password verified, proceed with deletion
      if (pendingDeleteId) {
        await deleteAppointment(pendingDeleteId)
        setDialogOpen(false)
        setEditingAppointment(null)
      } else if (pendingRecurrenceDelete && recurrenceTarget) {
        // Handle recurring appointment deletion
        const series = getSeriesAppointments(recurrenceTarget)
        const targetTime = new Date(recurrenceTarget.start_time).getTime()
        const toDelete = series.filter(
          (a) => new Date(a.start_time).getTime() >= targetTime,
        )
        for (const appt of toDelete) {
          await deleteAppointment(appt.id)
        }
        setDialogOpen(false)
        setEditingAppointment(null)
      }
      
      // Clean up
      setShowPasswordVerification(false)
      setPendingDeleteId(null)
      setPendingRecurrenceDelete(false)
      setVerificationError(null)
      setRecurrenceTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password verification failed"
      setVerificationError(message)
    } finally {
      setIsVerifying(false)
    }
  }, [pendingDeleteId, pendingRecurrenceDelete, recurrenceTarget, deleteAppointment, verifyPassword, getSeriesAppointments])

  /** Handle confirmed recurrence action (delete scope). */
  const handleRecurrenceConfirm = useCallback(
    async (scope: RecurrenceActionScope, count?: number) => {
      if (!recurrenceTarget) return
      setRecurrenceDialogOpen(false)

      // For delete action, show password verification
      if (recurrenceActionType === "delete") {
        // Store the scope for later use
        setRecurrenceTarget({ ...recurrenceTarget, recurrence_group_id: undefined })
        setPendingRecurrenceDelete(true)
        setShowPasswordVerification(true)
        return
      }

      // Other actions (edit) continue normally
      try {
        const series = getSeriesAppointments(recurrenceTarget)
        const targetIdx = series.findIndex((a) => a.id === recurrenceTarget.id)
        const targetTime = new Date(recurrenceTarget.start_time).getTime()

        let toDelete: Appointment[] = []
        if (scope === "this") {
          toDelete = [recurrenceTarget]
        } else if (scope === "this-and-next-n") {
          // e.g. count=2 → this + 2 following = 3 total
          toDelete = series.slice(targetIdx, targetIdx + 1 + (count ?? 1))
        } else if (scope === "this-and-following") {
          toDelete = series.filter(
            (a) => new Date(a.start_time).getTime() >= targetTime,
          )
        } else {
          toDelete = series
        }

        for (const appt of toDelete) {
          await deleteAppointment(appt.id)
        }

        setDialogOpen(false)
        setEditingAppointment(null)
      } catch (err) {
        console.error("Failed to delete recurring appointments:", err)
      }

      setRecurrenceTarget(null)
    },
    [recurrenceTarget, recurrenceActionType, getSeriesAppointments, deleteAppointment],
  )



  // ---- dialog openers ----

  const openNewDialog = useCallback(() => {
    if (!canManageAppointments) {
      setToast({
        id: crypto.randomUUID(),
        title: "Permission Denied",
        message: "Only staff members and admins can create appointments.",
        type: "warning",
      })
      return
    }
    setEditingAppointment(null)
    setPrefillStaffId(undefined)
    setPrefillStartMin(undefined)
    setDialogOpen(true)
  }, [canManageAppointments])

  const openSlotDialog = useCallback((staffId: string, startMinutes: number) => {
    // Check if the clicked slot is in the past
    const slotDate = setTimeOnDate(selectedDate, startMinutes)
    const now = new Date()
    
    if (slotDate < now) {
      // Show past appointment warning toast
      setToast({
        id: crypto.randomUUID(),
        title: "Cannot Create Appointment",
        message: "You can't appoint for a time in the past. Please select a future date and time.",
        type: "warning",
      })
      return
    }
    
    if (!canManageAppointments) {
      setToast({
        id: crypto.randomUUID(),
        title: "Permission Denied",
        message: "Only staff members and admins can create appointments.",
        type: "warning",
      })
      return
    }
    setEditingAppointment(null)
    setPrefillStaffId(staffId)
    setPrefillStartMin(startMinutes)
    setDialogOpen(true)
  }, [canManageAppointments])

  const openEditDialog = useCallback((appt: Appointment) => {
    if (!canManageAppointments) {
      setToast({
        id: crypto.randomUUID(),
        title: "Permission Denied",
        message: "Only staff members and admins can edit appointments.",
        type: "warning",
      })
      return
    }
    setEditingAppointment(appt)
    setPrefillStaffId(undefined)
    setPrefillStartMin(undefined)
    setDialogOpen(true)
  }, [canManageAppointments])

  const handleSettingsSave = useCallback(async (settings: CalendarSettings) => {
    try {
      setCalendarSettings(settings)
      await saveSettings(settings)
      
      // Also save work hours and lunch breaks to appointment_settings table
      const updatedAppointmentSettings = {
        ...appointmentSettings,
        working_hours_start: settings.workHoursStart || appointmentSettings?.working_hours_start,
        working_hours_end: settings.workHoursEnd || appointmentSettings?.working_hours_end,
        lunch_break_start: settings.lunchBreakStart || appointmentSettings?.lunch_break_start,
        lunch_break_end: settings.lunchBreakEnd || appointmentSettings?.lunch_break_end,
      }
      
      await saveAppointmentSettings(updatedAppointmentSettings)
      await refetchSettings()
      
      setToast({
        id: generateId(),
        title: "Success",
        message: "Calendar settings updated and synced globally",
        type: "success",
      })
    } catch (err) {
      console.error("Failed to save settings:", err)
      setToast({
        id: generateId(),
        title: "Error",
        message: "Failed to save calendar settings",
        type: "warning",
      })
    }
  }, [appointmentSettings, refetchSettings])

  /** Switch to day view when clicking a day in week/month view. */
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date)
    setViewMode("day")
  }, [])

  /** Handle confirm button on appointment reminder toast. */
  const handleConfirmAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        await updateAppointment(appointmentId, {
          status: "in-progress",
          updated_at: new Date().toISOString(),
        })
        setReminderToast(null)
        notifiedAppointmentsRef.current.delete(appointmentId)
      } catch (err) {
        console.error("Failed to confirm appointment:", err)
      }
    },
    [updateAppointment]
  )

  /** Handle reschedule button on appointment reminder toast. */
  const handleRescheduleFromReminder = useCallback(
    (appointment: Appointment) => {
      setReminderToast(null)
      setSelectedDate(new Date(appointment.start_time))
      setEditingAppointment(appointment)
      setPrefillStaffId(undefined)
      setPrefillStartMin(undefined)
      setDialogOpen(true)
    },
    []
  )

  // ---- appointment reminder timer ----
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      
      // Check for "scheduled" appointments that have reached their start time
      const appointmentToRemind = appointments.find((appt) => {
        if (appt.status !== "scheduled") return false
        if (notifiedAppointmentsRef.current.has(appt.id)) return false
        
        const startTime = new Date(appt.start_time)
        // Show reminder if appointment time has arrived or is within the next minute
        return startTime <= now && startTime > new Date(now.getTime() - 60000)
      })
      
      if (appointmentToRemind && !reminderToast) {
        setReminderToast({
          id: crypto.randomUUID(),
          appointment: appointmentToRemind,
        })
        notifiedAppointmentsRef.current.add(appointmentToRemind.id)
      }
    }
    
    // Check every 10 seconds for appointment reminders
    const interval = setInterval(checkReminders, 10000)
    return () => clearInterval(interval)
  }, [appointments, reminderToast])

  // ---- auto-complete appointments timer ----
  useEffect(() => {
    const checkCompletions = async () => {
      const now = new Date()
      
      // Find "in-progress" appointments that have passed their end time
      const appointmentsToComplete = appointments.filter((appt) => {
        if (appt.status !== "in-progress") return false
        
        const endTime = new Date(appt.end_time)
        // Mark as complete if end time has passed
        return endTime <= now
      })
      
      // Update each appointment to "completed"
      for (const appt of appointmentsToComplete) {
        try {
          await updateAppointment(appt.id, {
            status: "completed",
            updated_at: new Date().toISOString(),
          })
        } catch (err) {
          console.error("Failed to auto-complete appointment:", err)
        }
      }
    }
    
    // Check every 30 seconds for appointments to auto-complete
    const interval = setInterval(checkCompletions, 30000)
    return () => clearInterval(interval)
  }, [appointments, updateAppointment])

  // ========================================================================

  return (
    <Card className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden">
      <CalendarHeader
        selectedDate={selectedDate}
        interval={interval}
        viewMode={viewMode}
        showTableView={showTableView}
        onDateChange={setSelectedDate}
        onIntervalChange={setIntervalMinutes}
        onViewModeChange={setViewMode}
        onNewAppointment={openNewDialog}
        onToggleTableView={() => setShowTableView(!showTableView)}
      />

      {showTableView ? (
        <AppointmentsTableView
          appointments={appointments}
          onEdit={openEditDialog}
          onDelete={async (appointment) => handleDelete(appointment.id)}
        />
      ) : (
        <>
          {viewMode === "day" && (
            <CalendarGrid
              selectedDate={selectedDate}
              interval={interval}
              clinicHours={clinicHours}
              staff={staff}
              appointments={appointments}
              blockedTimes={blockedTimes}
              snapColumnsToFit={calendarSettings.snapColumnsToFit ?? true}
              onAppointmentUpdate={handleAppointmentUpdate}
              onSlotClick={openSlotDialog}
              onAppointmentClick={openEditDialog}
              onEditAppointment={openEditDialog}
              onDeleteAppointment={handleDelete}
            />
          )}

          {viewMode === "week" && (
            <CalendarWeekGrid
              selectedDate={selectedDate}
              interval={interval}
              clinicHours={clinicHours}
              staff={staff}
              appointments={appointments}
              blockedTimes={blockedTimes}
              onSlotClick={openSlotDialog}
              onAppointmentUpdate={handleAppointmentUpdate}
              onEditAppointment={openEditDialog}
              onDeleteAppointment={handleDelete}
              onDayClick={handleDayClick}
            />
          )}

          {viewMode === "month" && (
            <CalendarMonthGrid
              selectedDate={selectedDate}
              staff={staff}
              appointments={appointments}
              onDayClick={handleDayClick}
            />
          )}
        </>
      )}

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingAppointment(null)
            setRequestedAppointmentId(null)
            // Clear any navigation state that would re-open the dialog
            navigate(location.pathname, { replace: true, state: null })
            processedAppointmentIdRef.current = null

            // Safety cleanup: remove any lingering Radix overlay elements (prevents UI freeze)
            cleanupRadixOverlays()
          }
        }}
        appointment={editingAppointment}
        prefillStaffId={prefillStaffId}
        prefillStartMinutes={prefillStartMin}
        staff={staff}
        selectedDate={selectedDate}
        interval={interval}
        clinicHours={clinicHours}
        appointments={appointments}
        blockedTimes={blockedTimes}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <CalendarSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        staff={allStaff}
        settings={calendarSettings}
        onSave={handleSettingsSave}
      />

      <RecurrenceActionDialog
        open={recurrenceDialogOpen}
        onOpenChange={setRecurrenceDialogOpen}
        actionType={recurrenceActionType}
        seriesCount={
          recurrenceTarget
            ? getSeriesAppointments(recurrenceTarget).length
            : 0
        }
        remainingCount={(() => {
          if (!recurrenceTarget) return 0
          const s = getSeriesAppointments(recurrenceTarget)
          const idx = s.findIndex((a) => a.id === recurrenceTarget.id)
          return idx >= 0 ? s.length - idx : 0
        })()}
        onConfirm={handleRecurrenceConfirm}
        onEditInstead={() => {
          if (recurrenceTarget) openEditDialog(recurrenceTarget)
        }}
      />

      {/* Toast notification for past appointment warnings */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <NotificationToast
            id={toast.id}
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Appointment reminder toast with action buttons */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
          <div className="w-[420px] overflow-hidden rounded-xl bg-background/95 backdrop-blur-md shadow-2xl ring-1 ring-border border-l-4 border-primary">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Appointment Time Now</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {reminderToast.appointment.customer_name && (
                      <span className="font-semibold">{reminderToast.appointment.customer_name}</span>
                    )}
                    {reminderToast.appointment.customer_name && reminderToast.appointment.title && " • "}
                    {reminderToast.appointment.title}
                  </p>
                  {reminderToast.appointment.staff_name && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Staff: <span className="font-medium">{reminderToast.appointment.staff_name}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button
                  onClick={() => handleRescheduleFromReminder(reminderToast.appointment)}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-muted hover:bg-accent text-foreground transition-colors"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleConfirmAppointment(reminderToast.appointment.id)}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary/90 text-white transition-colors"
                >
                  Confirm & Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password verification dialog for appointment deletion */}
      <PasswordVerificationDialog
        open={showPasswordVerification}
        onOpenChange={(open) => {
          if (!open && !isVerifying) {
            setShowPasswordVerification(false)
            setPendingDeleteId(null)
            setPendingRecurrenceDelete(false)
            setVerificationError(null)
          }
        }}
        onVerify={handlePasswordVerified}
        title="Verify Password to Delete Appointment"
        description="Enter your password to confirm deletion of this appointment. This action cannot be undone."
        actionLabel="Verify & Delete"
        isVerifying={isVerifying}
        error={verificationError}
      />
    </Card>
  )
}
