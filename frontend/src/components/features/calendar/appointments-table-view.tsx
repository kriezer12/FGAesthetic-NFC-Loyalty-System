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
import { Badge } from "@/components/ui/badge"
import type { Appointment, AppointmentStatus } from "@/types/appointment"
import { cn } from "@/lib/utils"
import { Eye, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, ShoppingCart, Building2 } from "lucide-react"
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
  branchNameById?: Record<string, string>
  onEdit: (appointment: Appointment) => void
  onDelete: (appointment: Appointment) => void
  /** Set of appointment IDs that have already been checked out/transacted */
  checkedOutAppointmentIds?: Set<string>
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
  branchNameById,
  onEdit,
  onDelete,
  checkedOutAppointmentIds,
}: AppointmentsTableViewProps) {
  const { userProfile } = useAuth()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [deleteConfirmAppointment, setDeleteConfirmAppointment] = useState<Appointment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(expandedGroups)
    if (newSet.has(groupId)) newSet.delete(groupId)
    else newSet.add(groupId)
    setExpandedGroups(newSet)
  }

  const isAdmin = userProfile?.role === "super_admin" || userProfile?.role === "branch_admin"

  const getBranchBadge = (appointment: Appointment) => {
    if (!appointment.branch_id) return null
    const branchName = branchNameById?.[appointment.branch_id] || "Unknown branch"
    const isCrossBranch = Boolean(
      userProfile?.role === "super_admin" ||
      (userProfile?.branch_id && appointment.branch_id !== userProfile.branch_id),
    )

    return (
      <Badge variant={isCrossBranch ? "warning" : "outline"} className="gap-1 px-2 py-0 text-[10px] font-medium">
        <Building2 className="h-3 w-3" />
        {isCrossBranch ? "Cross-Branch" : "Branch"}: {branchName}
      </Badge>
    )
  }

  // Filter appointments based on user role
  const filteredAppointments = useMemo(() => {
    if (isAdmin) {
      return appointments
    }
    // Staff can only see their own appointments
    return appointments.filter((appt) => appt.staff_id === userProfile?.id)
  }, [appointments, isAdmin, userProfile?.id])

  // Group appointments
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    const standalone: Appointment[] = [];
    
    filteredAppointments.forEach(appt => {
      if (appt.recurrence_group_id) {
        if (!groups[appt.recurrence_group_id]) {
          groups[appt.recurrence_group_id] = [];
        }
        groups[appt.recurrence_group_id].push(appt);
      } else {
        standalone.push(appt);
      }
    });

    const result: { id: string; isGroup: boolean; appointments: Appointment[]; primary: Appointment }[] = [];
    
    Object.keys(groups).forEach(groupId => {
      const gAppts = [...groups[groupId]].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      
      if (gAppts.length === 1) {
        result.push({
          id: gAppts[0].id,
          isGroup: false,
          appointments: gAppts,
          primary: gAppts[0]
        });
      } else {
        let primaryIndex = gAppts.findIndex(a => ["scheduled", "confirmed", "in-progress"].includes(a.status));
        if (primaryIndex === -1) primaryIndex = 0;
        
        const primary = gAppts[primaryIndex];
        const rest = [...gAppts.slice(0, primaryIndex), ...gAppts.slice(primaryIndex + 1)];
        
        result.push({
          id: groupId,
          isGroup: true,
          appointments: [primary, ...rest],
          primary: primary
        });
      }
    });

    standalone.forEach(appt => {
      result.push({
        id: appt.id,
        isGroup: false,
        appointments: [appt],
        primary: appt
      });
    });

    return result;
  }, [filteredAppointments])

  // Sort groups
  const sortedGroups = useMemo(() => {
    const sorted = [...groupedAppointments]
    
    if (sortConfig !== null) {
      sorted.sort((a, b) => {
        let aValue = (a.primary as any)[sortConfig.key] || "";
        let bValue = (b.primary as any)[sortConfig.key] || "";

        if (sortConfig.key === "start_time") {
          aValue = new Date(a.primary.start_time).getTime();
          bValue = new Date(b.primary.start_time).getTime();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      })
    } else {
      sorted.sort((a, b) => {
        const aTime = new Date(a.primary.start_time).getTime()
        const bTime = new Date(b.primary.start_time).getTime()
        return aTime - bTime
      })
    }
    
    return sorted
  }, [groupedAppointments, sortConfig])

  // Pagination bounds
  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage)
  
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedGroups.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedGroups, currentPage, itemsPerPage])

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  const renderPagination = (isTop = false) => {
    if (totalPages <= 1) return null;

    return (
      <div className={cn("flex items-center justify-between px-2", isTop ? "pb-0 pt-0" : "py-4")}>
        <div className="text-sm text-muted-foreground hidden md:block">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, sortedGroups.length)} of{" "}
          {sortedGroups.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              if (
                i === 0 ||
                i === totalPages - 1 ||
                (i >= currentPage - 2 && i <= currentPage)
              ) {
                return (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                );
              }
              
              if (
                (i === 1 && currentPage > 3) ||
                (i === totalPages - 2 && currentPage < totalPages - 2)
              ) {
                return <span key={i} className="text-muted-foreground px-1">...</span>;
              }
              
              return null;
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold">
                <Button variant="ghost" onClick={() => requestSort("start_time")} className="flex items-center p-0 hover:bg-transparent h-auto font-semibold">
                  Date & Time {getSortIcon("start_time")}
                </Button>
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-left font-semibold">
                  <Button variant="ghost" onClick={() => requestSort("staff_name")} className="flex items-center p-0 hover:bg-transparent h-auto font-semibold">
                    Staff {getSortIcon("staff_name")}
                  </Button>
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold">
                <Button variant="ghost" onClick={() => requestSort("customer_name")} className="flex items-center p-0 hover:bg-transparent h-auto font-semibold">
                  Customer {getSortIcon("customer_name")}
                </Button>
              </th>
              <th className="px-4 py-3 text-left font-semibold">Branch</th>
              <th className="px-4 py-3 text-left font-semibold">
                <Button variant="ghost" onClick={() => requestSort("title")} className="flex items-center p-0 hover:bg-transparent h-auto font-semibold">
                  Service {getSortIcon("title")}
                </Button>
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                <Button variant="ghost" onClick={() => requestSort("status")} className="flex items-center p-0 hover:bg-transparent h-auto font-semibold">
                  Status {getSortIcon("status")}
                </Button>
              </th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No appointments found
                </td>
              </tr>
            ) : (
              paginatedGroups.map((group) => (
                <React.Fragment key={group.id}>
                  {group.appointments.map((appointment) => {
                    const isPrimary = appointment.id === group.primary.id;
                    
                    if (!isPrimary && !expandedGroups.has(group.id)) {
                      return null;
                    }

                    return (
                      <React.Fragment key={appointment.id}>
                      <tr
                        className={cn(
                           "border-b hover:bg-muted/50 transition-colors",
                           !isPrimary && "bg-muted/10"
                        )}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isPrimary && group.isGroup ? (
                              <Button variant="ghost" size="icon-sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={(e) => toggleGroup(group.id, e)}>
                                {expandedGroups.has(group.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            ) : (
                              <div className={cn("flex-shrink-0", group.isGroup ? "w-6" : "w-0")} />
                            )}
                            <div className={cn("flex flex-col gap-1", !isPrimary && "text-muted-foreground")}>
                              <span className="font-medium">
                                {format(parseISO(appointment.start_time), "MMM dd, yyyy")}
                              </span>
                              <span className="text-xs">
                                {format(parseISO(appointment.start_time), "hh:mm a")} -{" "}
                                {format(parseISO(appointment.end_time), "hh:mm a")}
                              </span>
                            </div>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <span className={cn("font-medium", !isPrimary && "font-normal text-muted-foreground")}>{appointment.staff_name}</span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={cn("font-medium", !isPrimary && "font-normal text-muted-foreground")}>
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
                            {getBranchBadge(appointment)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className={cn("font-medium max-w-xs truncate flex items-center gap-2", !isPrimary && "font-normal text-muted-foreground")}>
                              {appointment.title}
                              {isPrimary && group.isGroup && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-primary/10 text-primary whitespace-nowrap">
                                  Package ({group.appointments.length})
                                </span>
                              )}
                            </div>
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
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onEdit(appointment)}
                              title="Edit appointment"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!checkedOutAppointmentIds?.has(appointment.id) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => window.location.href = `/dashboard/checkout?appointmentId=${appointment.id}`}
                                title="Proceed to checkout"
                                className="text-green-600 hover:text-green-700"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            )}
                            {checkedOutAppointmentIds?.has(appointment.id) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled
                                title="Already checked out"
                                className="text-muted-foreground"
                              >
                                <ShoppingCart className="h-4 w-4" />
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
                          <td colSpan={isAdmin ? 7 : 6} className="px-4 py-4">
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
                                  {appointment.recurrence_group_id && (
                                    <div>
                                      <span className="font-medium">Package ID:</span>{" "}
                                      <span className="text-muted-foreground">
                                        {appointment.recurrence_group_id}
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
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderPagination(false)}

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
