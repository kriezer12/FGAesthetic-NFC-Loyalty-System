/**
 * Appointments Table View
 * =======================
 *
 * Displays all appointments in a table format.
 * Admins can see all staff appointments, staff see only their own.
 */

import React, { useState, useMemo } from "react"
import { format, parseISO } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import type { Appointment, AppointmentStatus } from "@/types/appointment"
import { cn } from "@/lib/utils"
import { Eye, Edit, Trash2 } from "lucide-react"
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

interface AppointmentsTableViewProps {
  appointments: Appointment[]
  onEdit: (appointment: Appointment) => void
  onDelete: (appointment: Appointment) => void
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  "in-progress": "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
}

export function AppointmentsTableView({
  appointments,
  onEdit,
  onDelete,
}: AppointmentsTableViewProps) {
  const { userProfile } = useAuth()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [deleteConfirmAppointment, setDeleteConfirmAppointment] = useState<Appointment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = userProfile?.role === "super_admin" || userProfile?.role === "branch_admin"

  // Filter appointments based on user role
  const filteredAppointments = useMemo(() => {
    if (isAdmin) {
      return appointments
    }
    // Staff can only see their own appointments
    return appointments.filter((appt) => appt.staff_id === userProfile?.id)
  }, [appointments, isAdmin, userProfile?.id])

  // Sort appointments by start_time
  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      const aTime = new Date(a.start_time).getTime()
      const bTime = new Date(b.start_time).getTime()
      return aTime - bTime
    })
  }, [filteredAppointments])

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
              {isAdmin && <th className="px-4 py-3 text-left font-semibold">Staff</th>}
              <th className="px-4 py-3 text-left font-semibold">Customer</th>
              <th className="px-4 py-3 text-left font-semibold">Service</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAppointments.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No appointments found
                </td>
              </tr>
            ) : (
              sortedAppointments.map((appointment) => (
                <React.Fragment key={appointment.id}>
                <tr
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {format(parseISO(appointment.start_time), "MMM dd, yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(appointment.start_time), "hh:mm a")} -{" "}
                        {format(parseISO(appointment.end_time), "hh:mm a")}
                      </span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <span className="font-medium">{appointment.staff_name}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {appointment.customer_name || "N/A"}
                      </span>
                      {appointment.customer_id && (
                        <span className="text-xs text-muted-foreground">
                          ID: {appointment.customer_id}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium max-w-xs truncate">
                        {appointment.title}
                      </span>
                      {appointment.treatment_name && (
                        <span className="text-xs text-muted-foreground">
                          {appointment.treatment_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-1 rounded-full text-xs font-medium",
                        STATUS_COLORS[appointment.status] ||
                          "bg-gray-100 text-gray-800"
                      )}
                    >
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setExpandedRow(
                          expandedRow === appointment.id ? null : appointment.id
                        )}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onEdit(appointment)}
                          title="Edit appointment"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteConfirmAppointment(appointment)}
                          title="Delete appointment"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRow === appointment.id && (
                  <tr className="bg-muted/30">
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-semibold text-muted-foreground mb-2">Appointment Details</div>
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium">Type:</span>{" "}
                              <span className="text-muted-foreground">
                                {appointment.appointment_type || "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Location:</span>{" "}
                              <span className="text-muted-foreground">
                                {appointment.location_type || "N/A"}
                              </span>
                            </div>
                            {appointment.customer_id && (
                              <div>
                                <span className="font-medium">Customer ID:</span>{" "}
                                <span className="text-muted-foreground">
                                  {appointment.customer_id}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-muted-foreground mb-2">Notes</div>
                          <p className="text-muted-foreground whitespace-pre-wrap text-xs">
                            {appointment.notes || "No notes"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">Total</div>
          <div className="mt-1 text-lg font-semibold">
            {filteredAppointments.length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">Scheduled</div>
          <div className="mt-1 text-lg font-semibold">
            {
              filteredAppointments.filter((a) => a.status === "scheduled")
                .length
            }
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">Confirmed</div>
          <div className="mt-1 text-lg font-semibold">
            {
              filteredAppointments.filter((a) => a.status === "confirmed")
                .length
            }
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">In Progress</div>
          <div className="mt-1 text-lg font-semibold">
            {
              filteredAppointments.filter((a) => a.status === "in-progress")
                .length
            }
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">Completed</div>
          <div className="mt-1 text-lg font-semibold">
            {
              filteredAppointments.filter((a) => a.status === "completed")
                .length
            }
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmAppointment} onOpenChange={(open) => !open && setDeleteConfirmAppointment(null)}>
        <AlertDialogContent className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span>Delete this appointment?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmAppointment && (
                <>
                  <span className="font-medium text-foreground">
                    {deleteConfirmAppointment.title}
                    {deleteConfirmAppointment.customer_name ? ` — ${deleteConfirmAppointment.customer_name}` : ""}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setIsDeleting(true)
                try {
                  if (deleteConfirmAppointment) {
                    await onDelete(deleteConfirmAppointment)
                  }
                } finally {
                  setIsDeleting(false)
                  setDeleteConfirmAppointment(null)
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
