/**
 * Customer Portal - Appointments
 * ==============================
 *
 * Simplified appointment booking interface for customers.
 * Allows customers to view and book appointments for themselves.
 */

import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { useAppointments } from "@/hooks/use-appointments"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, User, Trash2 } from "lucide-react"
import type { Appointment } from "@/types/appointment"
import { format, parseISO } from "date-fns"
import { CustomerAppointmentDialog } from "@/components/features/calendar/customer-appointment-dialog"

export default function PortalAppointments() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { appointments, addAppointment, updateAppointment, loading: appointmentsLoading } = useAppointments()
  
  const [bookingOpen, setBookingOpen] = useState(false)

  useEffect(() => {
    document.title = "My Appointments - FG Aesthetic Centre"
  }, [])

  // Get customer_id from userProfile if available (for customers)
  const customerId = userProfile?.customer_id || userProfile?.id
  const customerName = userProfile?.full_name



  // Filter appointments for this customer
  const myAppointments = useMemo(() => {
    if (!customerId) {
      return []
    }
    
    return appointments
      .filter((apt) => apt.customer_id === customerId)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [appointments, customerId])

  // Separate upcoming and past appointments
  const now = new Date()
  const upcomingAppointments = myAppointments.filter((apt) => new Date(apt.start_time) > now && apt.status !== "cancelled" && apt.status !== "completed")
  const pastAppointments = myAppointments.filter((apt) => new Date(apt.start_time) <= now || apt.status === "cancelled" || apt.status === "completed")

  const getStaffName = (staffId: string, staffName?: string) => {
    return staffName || staffId
  }

  const handleCancelAppointment = async (id: string) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await updateAppointment(id, { status: "cancelled" })
      } catch (err) {
        console.error("Failed to cancel appointment:", err)
      }
    }
  }

  const handleSaveAppointment = async (appointment: Appointment) => {
    try {
      // Ensure customer_id is set to the actual customer database ID
      const apptToSave = {
        ...appointment,
        customer_id: appointment.customer_id || customerId,
      }
      
      if (!apptToSave.customer_id) {
        throw new Error("Unable to book appointment: customer information not available")
      }
      
      await addAppointment(apptToSave)
      setBookingOpen(false)
    } catch (err) {
      console.error("Failed to book appointment:", err)
      alert(err instanceof Error ? err.message : "Failed to book appointment")
    }
  }

  return (
    <div className="space-y-6 pt-2 sm:pt-4 px-0 pb-8">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/portal/dashboard")}
            className="rounded-lg shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
              My Appointments
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">View, book, and manage</p>
          </div>
        </div>
        <Button
          onClick={() => setBookingOpen(true)}
          className="w-full sm:w-auto shadow-md shrink-0"
          size="default"
          disabled={!customerId}
        >
          <Calendar className="h-4 w-4 mr-1 sm:mr-2" /> 
          <span className="hidden sm:inline">Book New Appointment</span>
          <span className="sm:hidden">Book</span>
        </Button>
      </div>

      {/* Booking Dialog */}
      {customerId && (
        <CustomerAppointmentDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          customerId={customerId}
          customerName={customerName}
          onSave={handleSaveAppointment}
        />
      )}

      {/* Upcoming Appointments */}
      <div className="space-y-3 sm:space-y-4 px-4 sm:px-0">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Upcoming Appointments</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Your scheduled appointments</p>
        </div>

        {appointmentsLoading ? (
          <Card className="bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted-foreground border-t-primary" />
              <p className="text-muted-foreground mt-4 text-sm">Loading your appointments...</p>
            </CardContent>
          </Card>
        ) : !customerId ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <p className="text-destructive text-center mb-4 text-sm">
                {user ? "No customer profile found. Please contact support." : "Please sign in to view appointments"}
              </p>
            </CardContent>
          </Card>
        ) : upcomingAppointments.length === 0 ? (
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Calendar className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mb-3 sm:mb-4 opacity-50" />
              <p className="text-muted-foreground text-center mb-3 sm:mb-4 text-sm">No upcoming appointments</p>
              <Button onClick={() => setBookingOpen(true)} size="sm" className="w-full sm:w-auto">
                Book Your First Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {upcomingAppointments.map((apt) => (
              <Card key={apt.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg line-clamp-2">{apt.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm flex justify-between items-center mt-1">
                    {apt.appointment_type && (
                      <span className="capitalize">{apt.appointment_type}</span>
                    )}
                    <span className={`capitalize font-medium px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                      apt.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      apt.status === 'scheduled' ? 'bg-emerald-500/10 text-emerald-500' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {apt.status}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 sm:space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {format(parseISO(apt.start_time), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {format(parseISO(apt.start_time), "h:mm a")} -{" "}
                      {format(parseISO(apt.end_time), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{getStaffName(apt.staff_id, apt.staff_name)}</span>
                  </div>
                  {apt.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground line-clamp-2">{apt.notes}</p>
                    </div>
                  )}
                </CardContent>
                <div className="border-t p-2 sm:p-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => handleCancelAppointment(apt.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Cancel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t px-4 sm:px-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Past Appointments</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Your appointment history</p>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {pastAppointments.map((apt) => (
              <Card key={apt.id} className="opacity-75 hover:opacity-100 transition-opacity">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg line-clamp-2">{apt.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Status:{" "}
                    <span className="capitalize font-medium text-foreground">
                      {apt.status}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {format(parseISO(apt.start_time), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {format(parseISO(apt.start_time), "h:mm a")} -{" "}
                      {format(parseISO(apt.end_time), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{getStaffName(apt.staff_id, apt.staff_name)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

