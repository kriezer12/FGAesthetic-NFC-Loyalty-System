/**
 * Calendar View
 * =============
 *
 * Top-level orchestrator for the appointment calendar feature.
 * Owns all state (date, interval, appointments, dialog) and wires the
 * header, grid and dialog sub-components together.
 */

import { useCallback, useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import type { Appointment, IntervalMinutes, StaffMember, ViewMode } from "@/types/appointment"
import type { Service } from "@/types/service"
import {
  DEFAULT_INTERVAL,
} from "./calendar-parts/calendar-config"
import { startOfWeek, addDays } from "date-fns"
import { generateId } from "./calendar-parts/calendar-utils"
import { useStaff } from "@/hooks/use-staff"
import { useAppointments } from "@/hooks/use-appointments"
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
import { awardPointsForAppointment } from "./calendar-parts/loyalty-utils"

// ---- localStorage key ----
const SETTINGS_STORAGE_KEY = "calendar-settings"

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

/** Load settings from localStorage or return defaults */
function loadSettings(): CalendarSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!stored) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch (err) {
    console.error("Failed to load calendar settings:", err)
    return DEFAULT_SETTINGS
  }
}

/** Save settings to localStorage */
function saveSettings(settings: CalendarSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error("Failed to save calendar settings:", err)
  }
}

/** Get day-of-week string from Date (MON, TUE, etc.) */
function getDayOfWeek(date: Date): string {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  return days[date.getDay()]
}

export function CalendarView() {
  // ---- core state ----
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [interval, setInterval]         = useState<IntervalMinutes>(DEFAULT_INTERVAL)
  const [viewMode, setViewMode]         = useState<ViewMode>("day")
  
  // Fetch appointments from Supabase
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointments()

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
  
  // Load settings from localStorage (or defaults)
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(() => loadSettings())

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

  // ---- recurrence action dialog state ----
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false)
  const [recurrenceActionType, setRecurrenceActionType] = useState<RecurrenceActionType>("delete")
  const [recurrenceTarget, setRecurrenceTarget] = useState<Appointment | null>(null)

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
          await awardPointsForAppointment(updatedAppt)
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
      
      // If created as completed (unlikely but possible), award points
      if (appt.status === "completed") {
        await awardPointsForAppointment(appt)
      }
    } else {
      await updateAppointment(appt.id, appt)
      
      // If status changed to completed, award points
      if (appt.status === "completed" && oldAppt?.status !== "completed") {
        await awardPointsForAppointment(appt)
      }
    }
    // Dialog closes itself on success; errors propagate back to the dialog
  }, [appointments, addAppointment, updateAppointment])

  /** Delete from dialog. */
  const handleDelete = useCallback(async (id: string) => {
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
    // Single appointment — delete directly
    try {
      await deleteAppointment(id)
      setDialogOpen(false)
      setEditingAppointment(null)
    } catch (err) {
      console.error("Failed to delete appointment:", err)
    }
  }, [appointments, deleteAppointment, getSeriesAppointments])

  /** Handle confirmed recurrence action (delete scope). */
  const handleRecurrenceConfirm = useCallback(
    async (scope: RecurrenceActionScope, count?: number) => {
      if (!recurrenceTarget) return
      setRecurrenceDialogOpen(false)

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
    [recurrenceTarget, getSeriesAppointments, deleteAppointment],
  )

  // ---- dialog openers ----

  const openNewDialog = useCallback(() => {
    setEditingAppointment(null)
    setPrefillStaffId(undefined)
    setPrefillStartMin(undefined)
    setDialogOpen(true)
  }, [])

  const openSlotDialog = useCallback((staffId: string, startMinutes: number) => {
    setEditingAppointment(null)
    setPrefillStaffId(staffId)
    setPrefillStartMin(startMinutes)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((appt: Appointment) => {
    setEditingAppointment(appt)
    setPrefillStaffId(undefined)
    setPrefillStartMin(undefined)
    setDialogOpen(true)
  }, [])

  const handleSettingsSave = useCallback((settings: CalendarSettings) => {
    setCalendarSettings(settings)
    saveSettings(settings)
  }, [])

  /** Switch to day view when clicking a day in week/month view. */
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date)
    setViewMode("day")
  }, [])

  // ========================================================================

  return (
    <Card className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden">
      <CalendarHeader
        selectedDate={selectedDate}
        interval={interval}
        viewMode={viewMode}
        onDateChange={setSelectedDate}
        onIntervalChange={setInterval}
        onViewModeChange={setViewMode}
        onNewAppointment={openNewDialog}
        onOpenSettings={() => setSettingsDialogOpen(true)}
      />

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

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingAppointment(null) }}
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
    </Card>
  )
}
