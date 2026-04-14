/**
 * Customer Appointment Dialog
 * ==========================
 *
 * Simplified appointment booking form for customers.
 * Only includes: appointment type, services, date, location, time, and notes.
 * Staff and status are omitted (set by admin on confirmation).
 */

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import type { Service } from "@/types/service"
import type { Appointment } from "@/types/appointment"
import { generateId, setTimeOnDate, timeInputToMinutes } from "./calendar-parts/calendar-utils"
import { AlertCircle } from "lucide-react"
import { useStaff } from "@/hooks/use-staff"

interface CustomerAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
  customerName?: string
  onSave: (appointment: Appointment) => Promise<void>
}

const APPOINTMENT_TYPE_OPTIONS: { value: "consultation" | "treatment" | "followup"; label: string }[] = [
  { value: "consultation", label: "Consultation" },
  { value: "treatment", label: "Treatment" },
  { value: "followup", label: "Follow-up" },
]

const LOCATION_OPTIONS: { value: "branch" | "home_based"; label: string; description: string }[] = [
  { value: "branch", label: "At Our Clinic", description: "Visit us at our facility" },
  { value: "home_based", label: "Home Service", description: "We'll come to you" },
]

export function CustomerAppointmentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSave,
}: CustomerAppointmentDialogProps) {
  // Form state - default to tomorrow to avoid past appointments
  const getDefaultDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  const [appointmentType, setAppointmentType] = useState<"consultation" | "treatment" | "followup">("treatment")
  const [location, setLocation] = useState<"branch" | "home_based">("branch")
  const [staffId, setStaffId] = useState<string>("")
  const [appointmentDate, setAppointmentDate] = useState<Date>(getDefaultDate())
  const [startTime, setStartTime] = useState("10:00")
  const [endTime, setEndTime] = useState("11:00")
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [allServices, setAllServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { staff: allStaff } = useStaff()

  // Load services
  useEffect(() => {
    async function loadServices() {
      try {
        const { data, error: err } = await supabase
          .from("services")
          .select("id, category_id, name, uses_equipment, uses_product, price, is_package, session_count, sort_order")
          .order("name")

        if (err) throw err
        setAllServices((data as Service[]) || [])
      } catch (err) {
        console.error("Error loading services:", err)
      }
    }

    loadServices()
  }, [])

  // Calculate duration based on start and end time
  const durationMinutes = useMemo(() => {
    try {
      const startMinutes = timeInputToMinutes(startTime)
      const endMinutes = timeInputToMinutes(endTime)
      if (endMinutes <= startMinutes) return 0
      return endMinutes - startMinutes
    } catch {
      return 0
    }
  }, [startTime, endTime])

  // Handle service toggle
  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  // Handle save
  const handleSave = async () => {
    setError(null)

    if (!customerId) {
      setError("Customer information not available. Please try again.")
      return
    }

    if (!staffId) {
      setError("Please select a specific staff member")
      return
    }

    if (durationMinutes <= 0) {
      setError("End time must be after start time")
      return
    }

    if (durationMinutes > 480) {
      setError("Appointment cannot be longer than 8 hours")
      return
    }

    if (selectedServices.length === 0) {
      setError("Please select at least one service")
      return
    }

    try {
      setLoading(true)

      const selectedStaff = allStaff.find(s => s.id === staffId)

      const startDateTime = setTimeOnDate(appointmentDate, timeInputToMinutes(startTime))
      const endDateTime = setTimeOnDate(appointmentDate, timeInputToMinutes(endTime))

      // Create appointment object
      const appointment: any = {
        id: generateId(),
        customer_id: customerId,
        customer_name: customerName,
        staff_id: staffId,
        staff_name: selectedStaff?.name || "Unknown Staff",
        title: selectedServices
          .map((sid) => allServices.find((s) => s.id === sid)?.name)
          .filter(Boolean)
          .join(" + "),
        service_ids: selectedServices,
        appointment_type: appointmentType,
        location_type: location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: "pending",
        notes: `[Online Booking]${notes ? `\n\nNotes from customer: ${notes}` : ""}`,
        created_at: new Date().toISOString(),
      }

      await onSave(appointment)
      onOpenChange(false)

      // Reset form
      setAppointmentType("treatment")
      setLocation("branch")
      setAppointmentDate(getDefaultDate())
      setStartTime("10:00")
      setEndTime("11:00")
      setSelectedServices([])
      setNotes("")
    } catch (err) {
      console.error("Error saving appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to book appointment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="p-6 border-b shrink-0 bg-background z-10">
          <DialogTitle className="text-2xl">Book an Appointment</DialogTitle>
          <DialogDescription className="mt-2">
            Fill in your appointment details. Our team will confirm your booking within 24 hours.
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          {/* Appointment Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Appointment Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {APPOINTMENT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAppointmentType(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      appointmentType === option.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Location</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LOCATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLocation(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      location === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`font-medium ${location === option.value ? "text-primary" : ""}`}>
                      {option.label}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Preferred Staff Member</Label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="flex w-full h-11 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Choose Staff Member --</option>
                {allStaff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-3">
              <Label htmlFor="appointment-date" className="text-base font-semibold">
                Appointment Date
              </Label>
              <DatePicker value={appointmentDate} onChange={(date) => setAppointmentDate(date || new Date())} />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="start-time" className="text-base font-semibold">
                  Start Time
                </Label>
                <TimePicker value={startTime} onChange={setStartTime} />
              </div>
              <div className="space-y-3">
                <Label htmlFor="end-time" className="text-base font-semibold">
                  End Time
                </Label>
                <TimePicker value={endTime} onChange={setEndTime} />
              </div>
            </div>

            {durationMinutes > 0 && (
              <div className="text-sm text-muted-foreground px-3 py-2 bg-muted/50 rounded-md">
                Duration: <span className="font-medium">{durationMinutes} minutes</span>
              </div>
            )}

            {/* Services */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Services</Label>
              <div className="border rounded-lg p-4 space-y-2 bg-muted/20">
                {allServices.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allServices.map((service) => (
                      <div key={service.id} className="flex items-start gap-3 p-2 hover:bg-muted/30 rounded transition-colors">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                          className="mt-1"
                        />
                        <label
                          htmlFor={`service-${service.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div className="font-medium">{service.name}</div>
                          {service.is_package && (
                            <div className="text-xs text-muted-foreground">
                              Package • {service.session_count} sessions
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading services...</div>
                )}
              </div>
              {selectedServices.length === 0 && (
                <p className="text-xs text-destructive">Please select at least one service</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-base font-semibold">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or information about your appointment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
        </div>

        <div className="border-t p-6 flex gap-2 justify-end shrink-0 bg-background z-10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="min-w-[140px]">
            {loading ? "Booking..." : "Request Appointment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
