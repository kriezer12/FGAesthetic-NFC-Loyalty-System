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
import { ServicePicker } from "./service-picker"
import { supabase } from "@/lib/supabase"
import { useCustomers } from "@/hooks/use-customers"
import type { Service } from "@/types/service"
import type { Treatment } from "@/types/customer"
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
import { TriangleAlert, Pencil } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  /** Pre-filled service ids (e.g. from loyalty reward). */
  prefillServiceIds?: string[]
  staff: StaffMember[]
  selectedDate: Date
  interval: IntervalMinutes
  clinicHours: ClinicHours
  /** All appointments (for overlap validation). */
  appointments: Appointment[]
  blockedTimes: BlockedTime[]
  onSave: (appointment: Appointment) => Promise<void>
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
// Appointment type options
// ---------------------------------------------------------------------------

const APPOINTMENT_TYPE_OPTIONS: { value: "consultation" | "treatment" | "followup"; label: string }[] = [
  { value: "consultation", label: "Consultation" },
  { value: "treatment",    label: "Treatment" },
  { value: "followup",     label: "Follow‑up" },
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
  prefillServiceIds,
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
  const { customers, loading: customersLoading } = useCustomers()

  // ---- form state ----
  const [appointmentType, setAppointmentType] = useState<"consultation" | "treatment" | "followup">("treatment")
  const [serviceIds, setServiceIds]     = useState<string[]>([])
  const [allServices, setAllServices]   = useState<Service[]>([])
  const [customerId, setCustomerId]     = useState("")
  const [customerName, setCustomerName] = useState("")
  const [staffId, setStaffId]           = useState("")
  const [appointmentDate, setAppointmentDate] = useState<Date>(selectedDate)
  const [startTime, setStartTime]       = useState("")
  const [endTime, setEndTime]           = useState("")
  const [status, setStatus]             = useState<AppointmentStatus>("scheduled")
  const [locationType, setLocationType] = useState<"branch" | "home_based">("branch")
  const [treatmentId, setTreatmentId]   = useState<string>("")
  const [recurrenceCount, setRecurrenceCount] = useState(1)
  const [recurrenceInterval, setRecurrenceInterval] = useState<number | undefined>(undefined)
  const [notes, setNotes]               = useState("")
  const [error, setError]               = useState("")
  const [saving, setSaving]             = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

  // ---- fetch services for title derivation ----
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("services").select("*")
      setAllServices((data || []) as Service[])
    }
    load()
  }, [])

  const serviceMap = useMemo(
    () => new Map(allServices.map((s) => [s.id, s])),
    [allServices],
  )

  // Derive title from selected services (consultations get explicit label)
  const derivedTitle = useMemo(() => {
    if (appointmentType === "consultation") return "Consultation"
    return serviceIds.map((id) => serviceMap.get(id)?.name).filter(Boolean).join(", ")
  }, [serviceIds, serviceMap, appointmentType])

  const derivedRecurrenceDays = useMemo(() => {
    const days = new Set<number>()
    serviceIds.forEach((id) => {
      const svc = serviceMap.get(id)
      if (svc?.recurrence_days != null) {
        days.add(svc.recurrence_days)
      }
    })
    if (days.size === 1) {
      return Array.from(days)[0]
    }
    return undefined
  }, [serviceIds, serviceMap])

  const hasPackageSelected = useMemo(
    () => serviceIds.some((id) => serviceMap.get(id)?.is_package),
    [serviceIds, serviceMap],
  )

  // Auto-populate session count from a single selected package service
  const derivedSessionCount = useMemo(() => {
    const pkgServices = serviceIds
      .map((id) => serviceMap.get(id))
      .filter((s) => s?.is_package && s.session_count != null)
    if (pkgServices.length === 1) return pkgServices[0]!.session_count!
    return undefined
  }, [serviceIds, serviceMap])

  // @ts-expect-error - treatmentOptions is declared but its value is never read
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

  const locationOptions: ComboboxOption[] = useMemo(
    () => [
      { value: "branch", label: "Branch" },
      { value: "home_based", label: "Home Service" },
    ],
    []
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
    setConfirmingDelete(false)
    if (appointment) {
      setAppointmentType(appointment.appointment_type ?? "treatment")
      setServiceIds(appointment.service_ids ?? [])
      setCustomerId(appointment.customer_id ?? "")
      setCustomerName(appointment.customer_name ?? "")
      setStaffId(appointment.staff_id)
      setAppointmentDate(new Date(appointment.start_time))
      setStartTime(isoToTimeInput(appointment.start_time))
      setEndTime(isoToTimeInput(appointment.end_time))
      setStatus(appointment.status)
      setLocationType(appointment.location_type ?? "branch")
      setTreatmentId(appointment.treatment_id ?? "")
      setNotes(appointment.notes ?? "")
      setRecurrenceCount(appointment.recurrence_count ?? 1)
      setRecurrenceInterval(appointment.recurrence_days)
    } else {
      setAppointmentType("treatment")
      setServiceIds(prefillServiceIds ?? [])
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
      setLocationType("branch")
      setNotes("")
      setRecurrenceCount(1)
      setRecurrenceInterval(undefined)
    }
    setError("")
  }, [open, appointment, prefillStaffId, prefillStartMinutes, prefillCustomerId, prefillCustomerName, prefillServiceIds, staff, interval, selectedDate])

  // sync interval when package selection changes; default to 7 (weekly) if service has no interval set
  useEffect(() => {
    if (!hasPackageSelected) {
      // Reset recurrence fields when no package is selected
      setRecurrenceInterval(undefined)
      setRecurrenceCount(1)
      return
    }
    setRecurrenceInterval(derivedRecurrenceDays ?? 7)
  }, [derivedRecurrenceDays, hasPackageSelected])

  // auto-populate session count from the selected package service
  useEffect(() => {
    if (derivedSessionCount !== undefined) {
      setRecurrenceCount(derivedSessionCount)
    }
  }, [derivedSessionCount])

  // ---- save handler ----
  const handleSave = async () => {
    /* required fields */
    if (appointmentType !== "consultation" && serviceIds.length === 0) { setError("Please select at least one service."); return }
    if (!customerId && !customerName) { setError("Please select or enter a customer."); return }
    if (!staffId)                { setError("Please select a staff member."); return }
    if (!startTime || !endTime)  { setError("Start and end times are required."); return }
    if (hasPackageSelected) {
      if (recurrenceCount < 1) {
        setError("Recurrence count must be at least 1.");
        return
      }
      if (recurrenceCount > 1 && (recurrenceInterval == null || recurrenceInterval < 1)) {
        setError("Please specify recurrence interval in days.");
        return
      }
    }

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
    const overlapType = hasOverlap(excludeId, staffId, customerId || undefined, startMin, endMin, appointmentDate, appointments)
    if (overlapType) {
      if (overlapType === "customer") {
        setError("This customer already has an appointment at this time.")
      } else {
        setError("This time conflicts with another appointment for the selected staff.")
      }
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

    const now = new Date().toISOString()
    const appt: Appointment = {
      id:               appointment?.id ?? generateId(),
      appointment_type: appointmentType,
      customer_id:      customerId || appointment?.customer_id,
      customer_name:    customerName || undefined,
      staff_id:         staffId,
      staff_name:       staffMember.name,
      title:            derivedTitle || "Appointment",
      service_ids:      serviceIds.length > 0 ? serviceIds : undefined,
      start_time:       startDate.toISOString(),
      end_time:         endDate.toISOString(),
      status:           status,
      location_type:    locationType,
      notes:            notes || undefined,
      treatment_id:     treatmentId || undefined,
      recurrence_days:  hasPackageSelected ? recurrenceInterval : undefined,
      recurrence_count: hasPackageSelected && recurrenceInterval ? recurrenceCount : undefined,
      recurrence_group_id: appointment?.recurrence_group_id,
      created_at:       appointment?.created_at ?? now,
      updated_at:       now,
    }
    setSaving(true)
    try {
      await onSave(appt)

      // Auto-assign package services as treatments on the customer record
      if (!isEdit && customerId) {
        const packageServices = serviceIds
          .map((id) => serviceMap.get(id))
          .filter((s): s is Service => !!s && !!s.is_package && s.session_count != null)

        if (packageServices.length > 0) {
          const customer = customers.find((c) => c.id === customerId)
          if (customer) {
            const existing: Treatment[] = customer.treatments || []
            const existingNames = new Set(existing.map((t) => t.name))
            const newTreatments: Treatment[] = packageServices
              .filter((s) => !existingNames.has(s.name))
              .map((s) => ({
                id: generateId(),
                name: s.name,
                total_sessions: s.session_count!,
                used_sessions: 0,
                remaining_sessions: s.session_count!,
              }))
            if (newTreatments.length > 0) {
              await supabase
                .from("customers")
                .update({ treatments: [...existing, ...newTreatments] })
                .eq("id", customerId)
            }
          }
        }
      }

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save appointment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Appointment" : "New Appointment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the appointment details below."
              : "Fill in the details to schedule a new appointment."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 overflow-y-auto overflow-x-hidden pr-1">
          {/* Appointment type */}
          <div className="grid gap-1.5">
            <Label>Appointment Type</Label>
            <Combobox
              options={APPOINTMENT_TYPE_OPTIONS}
              value={appointmentType}
              onValueChange={setAppointmentType}
            />
          </div>

          {/* Services (only for non-consultation) */}
          {appointmentType !== "consultation" && (
            <div className="grid gap-1.5">
              <Label>
                Services <span className="text-destructive">*</span>
              </Label>
              <ServicePicker
                value={serviceIds}
                onChange={setServiceIds}
              />
            </div>
          )}

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
                minTime={minutesToTimeInput(clinicHours.open * 60)}
                maxTime={minutesToTimeInput(clinicHours.close * 60)}
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
                minTime={minutesToTimeInput(clinicHours.open * 60)}
                maxTime={minutesToTimeInput(clinicHours.close * 60)}
              />
            </div>
          </div>

          {/* Recurrence */}
          {hasPackageSelected && (
            <div className="rounded-md border bg-muted/40 p-3 grid gap-3">
              <p className="text-xs text-muted-foreground font-medium">Package scheduling — appointments will be created automatically</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Days between sessions</Label>
                  <Input
                    type="number"
                    min={1}
                    value={recurrenceInterval ?? ""}
                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || undefined)}
                    placeholder="7 (weekly)"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Total sessions</Label>
                  <Input
                    type="number"
                    min={1}
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="grid gap-1.5">
            <Label>Location</Label>
            <Combobox
              options={locationOptions}
              value={locationType}
              onValueChange={(val) => setLocationType(val as "branch" | "home_based")}
              placeholder="Select location..."
              searchPlaceholder="Search location..."
              emptyMessage="No location found."
            />
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
            <div className="flex items-center justify-between">
              <Label htmlFor="appt-notes">Notes</Label>
              <span className={`text-xs tabular-nums ${
                notes.length > 360 ? "text-destructive" : "text-muted-foreground"
              }`}>
                {notes.length}/400
              </span>
            </div>
            <Textarea
              id="appt-notes"
              rows={3}
              maxLength={400}
              placeholder="Skin/hair sensitivities, product preferences, allergies, follow-up reminders…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Use for skin/hair sensitivities, preferences, product notes, or follow-up reminders.
            </p>
          </div>

          {/* Validation error */}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEdit && onDelete && appointment && (
            <Button
              variant="destructive"
              size="sm"
              className="mr-auto"
              onClick={() => {
                if (appointment.recurrence_group_id) {
                  onDelete(appointment.id)
                } else {
                  setConfirmingDelete(true)
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete confirmation — centred AlertDialog over the edit dialog */}
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <AlertDialogContent className="flex flex-col gap-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-destructive" />
            Delete this appointment?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {appointment && (
              <>
                <span className="font-medium text-foreground">
                  {appointment.title}
                  {appointment.customer_name ? ` — ${appointment.customer_name}` : ""}
                </span>
                <br />
              </>
            )}
            This action is permanent and cannot be undone. Were you trying to make a change instead?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Deleted appointments are removed permanently and cannot be recovered.
        </div>
        <AlertDialogFooter className="gap-3 sm:gap-3 mt-2">
          <button
            onClick={() => setConfirmingDelete(false)}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit instead
          </button>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => appointment && onDelete!(appointment.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
