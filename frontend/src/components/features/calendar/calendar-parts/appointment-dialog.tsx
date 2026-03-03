/**
 * Appointment Dialog
 * ==================
 *
 * A modal form for creating or editing an appointment.
 * Validates working hours, overlaps and blocked-time conflicts before saving.
 */

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  Appointment,
  AppointmentStatus,
  BlockedTime,
  ClinicHours,
  IntervalMinutes,
  StaffMember,
} from "@/types/appointment"
import {
  formatTime,
  generateId,
  hasBlockedTimeConflict,
  hasOverlap,
  isoToTimeInput,
  isWithinWorkingHours,
  minutesToTimeInput,
  setTimeOnDate,
  timeInputToMinutes,
} from "./calendar-utils"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** If set, the dialog is in "edit" mode; otherwise "create" mode. */
  appointment?: Appointment | null
  /** Pre-filled staff id when the user clicks an empty slot. */
  prefillStaffId?: string
  /** Pre-filled start time (minutes since midnight) from slot click. */
  prefillStartMinutes?: number
  staff: StaffMember[]
  selectedDate: Date
  interval: IntervalMinutes
  clinicHours: ClinicHours
  /** All appointments (for overlap validation). */
  appointments: Appointment[]
  blockedTimes: BlockedTime[]
  onSave: (appointment: Appointment) => void
  onDelete?: (id: string) => void
}

// ---------------------------------------------------------------------------
// Status options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "scheduled",   label: "Scheduled" },
  { value: "confirmed",   label: "Confirmed" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  prefillStaffId,
  prefillStartMinutes,
  staff,
  selectedDate,
  interval,
  clinicHours,
  appointments,
  blockedTimes,
  onSave,
  onDelete,
}: AppointmentDialogProps) {
  const isEdit = Boolean(appointment)

  // ---- form state ----
  const [title, setTitle]             = useState("")
  const [customerName, setCustomerName] = useState("")
  const [staffId, setStaffId]         = useState("")
  const [startTime, setStartTime]     = useState("")
  const [endTime, setEndTime]         = useState("")
  const [status, setStatus]           = useState<AppointmentStatus>("scheduled")
  const [notes, setNotes]             = useState("")
  const [error, setError]             = useState("")

  // ---- reset / populate on open ----
  useEffect(() => {
    if (!open) return
    if (appointment) {
      setTitle(appointment.title)
      setCustomerName(appointment.customer_name ?? "")
      setStaffId(appointment.staff_id)
      setStartTime(isoToTimeInput(appointment.start_time))
      setEndTime(isoToTimeInput(appointment.end_time))
      setStatus(appointment.status)
      setNotes(appointment.notes ?? "")
    } else {
      setTitle("")
      setCustomerName("")
      setStaffId(prefillStaffId ?? staff[0]?.id ?? "")
      setStartTime(
        prefillStartMinutes != null ? minutesToTimeInput(prefillStartMinutes) : "",
      )
      setEndTime(
        prefillStartMinutes != null
          ? minutesToTimeInput(prefillStartMinutes + interval)
          : "",
      )
      setStatus("scheduled")
      setNotes("")
    }
    setError("")
  }, [open, appointment, prefillStaffId, prefillStartMinutes, staff, interval])

  // ---- save handler ----
  const handleSave = () => {
    /* required fields */
    if (!title.trim())           { setError("Title is required.");            return }
    if (!staffId)                { setError("Please select a staff member."); return }
    if (!startTime || !endTime)  { setError("Start and end times are required."); return }

    const startMin = timeInputToMinutes(startTime)
    const endMin   = timeInputToMinutes(endTime)

    if (endMin <= startMin)      { setError("End time must be after start time."); return }

    /* working hours */
    if (!isWithinWorkingHours(startMin, endMin, clinicHours)) {
      const oh = formatTime(clinicHours.open * 60)
      const ch = formatTime(clinicHours.close * 60)
      setError(`Appointment must be within clinic hours (${oh} – ${ch}).`)
      return
    }

    /* overlap */
    const excludeId = appointment?.id ?? ""
    if (hasOverlap(excludeId, staffId, startMin, endMin, appointments)) {
      setError("This time conflicts with another appointment for the selected staff.")
      return
    }

    /* blocked time */
    if (hasBlockedTimeConflict(staffId, startMin, endMin, blockedTimes)) {
      setError("This time is blocked for the selected staff member.")
      return
    }

    const startDate = setTimeOnDate(selectedDate, startMin)
    const endDate   = setTimeOnDate(selectedDate, endMin)
    const staffMember = staff.find((s) => s.id === staffId)!

    const appt: Appointment = {
      id:            appointment?.id ?? generateId(),
      customer_id:   appointment?.customer_id,
      customer_name: customerName || undefined,
      staff_id:      staffId,
      staff_name:    staffMember.name,
      title:         title.trim(),
      start_time:    startDate.toISOString(),
      end_time:      endDate.toISOString(),
      status,
      notes:         notes || undefined,
      created_at:    appointment?.created_at ?? new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }
    onSave(appt)
  }

  // ---- styling helper for native selects ----
  const selectCls =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs " +
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Appointment" : "New Appointment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the appointment details below."
              : "Fill in the details to schedule a new appointment."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="appt-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="appt-title"
              placeholder="e.g. Facial Treatment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Customer name */}
          <div className="grid gap-1.5">
            <Label htmlFor="appt-customer">Customer Name</Label>
            <Input
              id="appt-customer"
              placeholder="Optional"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Staff */}
          <div className="grid gap-1.5">
            <Label htmlFor="appt-staff">
              Staff <span className="text-destructive">*</span>
            </Label>
            <select
              id="appt-staff"
              className={selectCls}
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.role}
                </option>
              ))}
            </select>
          </div>

          {/* Start / End times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="appt-start">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="appt-start"
                type="time"
                step={interval * 60}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="appt-end">
                End Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="appt-end"
                type="time"
                step={interval * 60}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid gap-1.5">
            <Label htmlFor="appt-status">Status</Label>
            <select
              id="appt-status"
              className={selectCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label htmlFor="appt-notes">Notes</Label>
            <textarea
              id="appt-notes"
              rows={2}
              className={selectCls + " resize-none py-2"}
              placeholder="Optional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Validation error */}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isEdit && onDelete && appointment && (
            <Button
              variant="destructive"
              size="sm"
              className="mr-auto"
              onClick={() => onDelete(appointment.id)}
            >
              Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
