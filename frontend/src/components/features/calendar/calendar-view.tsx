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
import type { Appointment, IntervalMinutes, StaffMember } from "@/types/appointment"
import {
  DEFAULT_INTERVAL,
} from "./calendar-parts/calendar-config"
import { generateId } from "./calendar-parts/calendar-utils"
import { useStaff } from "@/hooks/use-staff"
import { useAppointments } from "@/hooks/use-appointments"
import { CalendarHeader } from "./calendar-parts/calendar-header"
import { CalendarGrid } from "./calendar-parts/calendar-grid"
import { AppointmentDialog } from "./calendar-parts/appointment-dialog"
import { CalendarSettingsDialog, type CalendarSettings } from "./calendar-parts/calendar-settings-dialog"

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
  
  // Fetch appointments from Supabase
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointments()
  
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

  // Add lunch break to blocked times if configured
  if (calendarSettings.lunchBreakStart && calendarSettings.lunchBreakEnd) {
    const [lunchHour, lunchMin] = calendarSettings.lunchBreakStart.split(":").map(Number)
    const [endHour, endMin] = calendarSettings.lunchBreakEnd.split(":").map(Number)
    const lunchStart = new Date(selectedDate)
    lunchStart.setHours(lunchHour, lunchMin, 0, 0)
    const lunchEnd = new Date(selectedDate)
    lunchEnd.setHours(endHour, endMin, 0, 0)

    // Add lunch break for all staff
    staff.forEach((s: StaffMember) => {
      if (
        !blockedTimes.some(
          (b) =>
            b.staff_id === s.id &&
            b.reason === "Lunch Break" &&
            new Date(b.start_time).toDateString() === selectedDate.toDateString()
        )
      ) {
        blockedTimes = [
          ...blockedTimes,
          {
            id: `lunch-${s.id}-${selectedDate.toISOString().split("T")[0]}`,
            staff_id: s.id,
            start_time: lunchStart.toISOString(),
            end_time: lunchEnd.toISOString(),
            reason: "Lunch Break",
          },
        ]
      }
    })
  }

  // ---- dialog state ----
  const [dialogOpen, setDialogOpen]             = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [prefillStaffId, setPrefillStaffId]     = useState<string | undefined>()
  const [prefillStartMin, setPrefillStartMin]   = useState<number | undefined>()

  // ---- CRUD callbacks ----

  /** Inline update (drag / resize). */
  const handleAppointmentUpdate = useCallback(
    (id: string, updates: Partial<Appointment>) => {
      updateAppointment(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      }).catch((err) => {
        console.error("Failed to update appointment:", err)
      })
    },
    [updateAppointment],
  )

  /** Save from dialog (create or edit). */
  const addDaysToIso = (iso: string, days: number) => {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString()
  }

  const handleSave = useCallback(async (appt: Appointment) => {
    try {
      const isNew = !appointments.find((a) => a.id === appt.id)

      if (isNew) {
        // if recurrence requested, add sequence
        if (appt.recurrence_days && appt.recurrence_count && appt.recurrence_count > 1) {
          let current = appt
          // first appointment
          await addAppointment(current)
          for (let i = 1; i < appt.recurrence_count; i++) {
            const next: Appointment = {
              ...current,
              id: generateId(),
              start_time: addDaysToIso(current.start_time, appt.recurrence_days),
              end_time: addDaysToIso(current.end_time, appt.recurrence_days),
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
      }

      setDialogOpen(false)
      setEditingAppointment(null)
    } catch (err) {
      console.error("Failed to save appointment:", err)
    }
  }, [appointments, addAppointment, updateAppointment])

  /** Delete from dialog. */
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteAppointment(id)
      setDialogOpen(false)
      setEditingAppointment(null)
    } catch (err) {
      console.error("Failed to delete appointment:", err)
    }
  }, [deleteAppointment])

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

  // ========================================================================

  return (
    <Card className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden">
      <CalendarHeader
        selectedDate={selectedDate}
        interval={interval}
        onDateChange={setSelectedDate}
        onIntervalChange={setInterval}
        onNewAppointment={openNewDialog}
        onOpenSettings={() => setSettingsDialogOpen(true)}
      />

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

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
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
    </Card>
  )
}
