/**
 * Calendar View
 * =============
 *
 * Top-level orchestrator for the appointment calendar feature.
 * Owns all state (date, interval, appointments, dialog) and wires the
 * header, grid and dialog sub-components together.
 */

import { useCallback, useState } from "react"
import { Card } from "@/components/ui/card"
import type { Appointment, IntervalMinutes } from "@/types/appointment"
import {
  DEFAULT_CLINIC_HOURS,
  DEFAULT_INTERVAL,
  MOCK_APPOINTMENTS,
  MOCK_BLOCKED_TIMES,
  MOCK_STAFF,
} from "./calendar-parts/calendar-config"
import { CalendarHeader } from "./calendar-parts/calendar-header"
import { CalendarGrid } from "./calendar-parts/calendar-grid"
import { AppointmentDialog } from "./calendar-parts/appointment-dialog"

export function CalendarView() {
  // ---- core state ----
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [interval, setInterval]         = useState<IntervalMinutes>(DEFAULT_INTERVAL)
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS)

  // data that will eventually come from Supabase
  const staff        = MOCK_STAFF
  const blockedTimes = MOCK_BLOCKED_TIMES
  const clinicHours  = DEFAULT_CLINIC_HOURS

  // ---- dialog state ----
  const [dialogOpen, setDialogOpen]             = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [prefillStaffId, setPrefillStaffId]     = useState<string | undefined>()
  const [prefillStartMin, setPrefillStartMin]   = useState<number | undefined>()

  // ---- CRUD callbacks ----

  /** Inline update (drag / resize). */
  const handleAppointmentUpdate = useCallback(
    (id: string, updates: Partial<Appointment>) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a)),
      )
    },
    [],
  )

  /** Save from dialog (create or edit). */
  const handleSave = useCallback((appt: Appointment) => {
    setAppointments((prev) => {
      const idx = prev.findIndex((a) => a.id === appt.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = appt
        return next
      }
      return [...prev, appt]
    })
    setDialogOpen(false)
    setEditingAppointment(null)
  }, [])

  /** Delete from dialog. */
  const handleDelete = useCallback((id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id))
    setDialogOpen(false)
    setEditingAppointment(null)
  }, [])

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

  // ========================================================================

  return (
    <Card className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden">
      <CalendarHeader
        selectedDate={selectedDate}
        interval={interval}
        onDateChange={setSelectedDate}
        onIntervalChange={setInterval}
        onNewAppointment={openNewDialog}
      />

      <CalendarGrid
        selectedDate={selectedDate}
        interval={interval}
        clinicHours={clinicHours}
        staff={staff}
        appointments={appointments}
        blockedTimes={blockedTimes}
        onAppointmentUpdate={handleAppointmentUpdate}
        onSlotClick={openSlotDialog}
        onAppointmentClick={openEditDialog}
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
    </Card>
  )
}
