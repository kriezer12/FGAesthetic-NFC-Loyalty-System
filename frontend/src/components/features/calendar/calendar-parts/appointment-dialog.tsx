/**
 * Appointment Dialog
 * ==================
 *
 * A modal form for creating or editing an appointment.
 * Validates working hours, overlaps and blocked-time conflicts before saving.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { useCustomers } from "@/hooks/use-customers"
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
  /** Pre-filled customer id (e.g., from customer page). */
  prefillCustomerId?: string
  /** Pre-filled customer name (e.g., from customer page). */
  prefillCustomerName?: string
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
  prefillCustomerId,
  prefillCustomerName,
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

  // ---- hooks ----
  const { customers, loading: customersLoading, search: searchCustomers } = useCustomers()

  // ---- form state ----
  const [title, setTitle]               = useState("")
  const [customerId, setCustomerId]     = useState("")
  const [customerName, setCustomerName] = useState("")
  const [staffId, setStaffId]           = useState("")
  const [appointmentDate, setAppointmentDate] = useState<Date>(selectedDate)
  const [startTime, setStartTime]       = useState("")
  const [endTime, setEndTime]           = useState("")
  const [status, setStatus]             = useState<AppointmentStatus>("scheduled")
  const [treatmentId, setTreatmentId]   = useState<string>("")
  const [notes, setNotes]               = useState("")
  const [error, setError]               = useState("")

  // ---- memoized options ----
  const staffOptions: ComboboxOption[] = useMemo(
    () =>
      staff.map((s) => ({
        value: s.id,
        label: s.name,
        description: s.role,
      })),
    [staff]
  )

  const treatmentOptions: ComboboxOption[] = useMemo(() => {
    const cust = customers.find((c) => c.id === customerId)
    return (cust?.treatments || []).map((t) => ({
      value: t.id,
      label: t.name,
    }))
  }, [customers, customerId])

  const customerOptions: ComboboxOption[] = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown",
        description: c.email || c.phone || undefined,
      })),
    [customers]
  )

  const statusOptions: ComboboxOption[] = useMemo(
    () =>
      STATUS_OPTIONS.map((s) => ({
        value: s.value,
        label: s.label,
      })),
    []
  )

  // ---- debounced customer search ----
  const handleCustomerSearch = useCallback(
    (query: string) => {
      searchCustomers(query)
    },
    [searchCustomers]
  )

  // ---- handle customer selection ----
  const handleCustomerChange = useCallback(
    (value: string) => {
      setCustomerId(value)
      const customer = customers.find((c) => c.id === value)
      if (customer) {
        setCustomerName(
          customer.name || `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
        )
        // reset treatment selection when customer changes
        setTreatmentId("")
      }
    },
    [customers]
  )

  // ---- reset / populate on open ----
  useEffect(() => {
    if (!open) return
    if (appointment) {
      setTitle(appointment.title)
      setCustomerId(appointment.customer_id ?? "")
      setCustomerName(appointment.customer_name ?? "")
      setStaffId(appointment.staff_id)
      setAppointmentDate(new Date(appointment.start_time))
      setStartTime(isoToTimeInput(appointment.start_time))
      setEndTime(isoToTimeInput(appointment.end_time))
      setStatus(appointment.status)
      setTreatmentId(appointment.treatment_id ?? "")
      setNotes(appointment.notes ?? "")
    } else {
      setTitle("")
      setCustomerId(prefillCustomerId ?? "")
      setCustomerName(prefillCustomerName ?? "")
      setStaffId(prefillStaffId ?? staff[0]?.id ?? "")
      setAppointmentDate(selectedDate)
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
  }, [open, appointment, prefillStaffId, prefillStartMinutes, prefillCustomerId, prefillCustomerName, staff, interval, selectedDate])

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
    if (hasOverlap(excludeId, staffId, startMin, endMin, appointmentDate, appointments)) {
      setError("This time conflicts with another appointment for the selected staff.")
      return
    }

    /* blocked time */
    if (hasBlockedTimeConflict(staffId, startMin, endMin, appointmentDate, blockedTimes)) {
      setError("This time is blocked for the selected staff member.")
      return
    }

    const startDate = setTimeOnDate(appointmentDate, startMin)
    const endDate   = setTimeOnDate(appointmentDate, endMin)
    const staffMember = staff.find((s) => s.id === staffId)!

    const appt: Appointment = {
      id:            appointment?.id ?? generateId(),
      customer_id:   customerId || appointment?.customer_id,
      customer_name: customerName || undefined,
      staff_id:      staffId,
      staff_name:    staffMember.name,
      title:         title.trim(),
      treatment_id:  treatmentId || undefined,
      treatment_name: treatmentOptions.find((t) => t.value === treatmentId)?.label,
      start_time:    startDate.toISOString(),
      end_time:      endDate.toISOString(),
      status,
      notes:         notes || undefined,
      created_at:    appointment?.created_at ?? new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }
    onSave(appt)
  }

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

          {/* Customer */}
          <div className="grid gap-1.5">
            <Label>Customer</Label>
            <Combobox
              options={customerOptions}
              value={customerId}
              onValueChange={handleCustomerChange}
              placeholder="Search for a customer..."
              searchPlaceholder="Type to search customers..."
              emptyMessage={customersLoading ? "Loading..." : "No customers found."}
            />
          </div>

          {/* Staff */}
          <div className="grid gap-1.5">
            <Label>
              Staff <span className="text-destructive">*</span>
            </Label>
            <Combobox
              options={staffOptions}
              value={staffId}
              onValueChange={setStaffId}
              placeholder="Select staff member..."
              searchPlaceholder="Search staff..."
              emptyMessage="No staff found."
            />
          </div>

          {/* Appointment Date */}
          <div className="grid gap-1.5">
            <Label>Appointment Date</Label>
            <DatePicker
              value={appointmentDate}
              onChange={(date) => date && setAppointmentDate(date)}
              placeholder="Select appointment date"
            />
          </div>

          {/* Start / End times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>
                Start Time <span className="text-destructive">*</span>
              </Label>
              <TimePicker
                value={startTime}
                onChange={setStartTime}
                minuteStep={interval as 15 | 30 | 60}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                End Time <span className="text-destructive">*</span>
              </Label>
              <TimePicker
                value={endTime}
                onChange={setEndTime}
                minuteStep={interval as 15 | 30 | 60}
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Combobox
              options={statusOptions}
              value={status}
              onValueChange={(val) => setStatus(val as AppointmentStatus)}
              placeholder="Select status..."
              searchPlaceholder="Search status..."
              emptyMessage="No status found."
            />
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label htmlFor="appt-notes">Notes</Label>
            <Textarea
              id="appt-notes"
              rows={3}
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
