/**
 * Appointment Card
 * ================
 *
 * A single appointment rendered inside a staff column.
 * Supports drag-to-move (whole card) and resize (bottom handle).
 * Right-click opens a context menu with Edit / Delete options.
 * Content adapts to card height — compact cards show only the title.
 */

import type { Appointment, AppointmentStatus } from "@/types/appointment"
import { minutesSinceMidnight, formatTime } from "./calendar-utils"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu"
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
import { useState } from "react"
import { Pencil, Trash2, Repeat, TriangleAlert, Home, CheckCircle, Play, Check, X, ShoppingCart } from "lucide-react"

// ---------------------------------------------------------------------------
// Status dot colours
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled:   "bg-yellow-400",
  confirmed:   "bg-green-400",
  "in-progress": "bg-blue-400",
  completed:   "bg-gray-400",
  cancelled:   "bg-red-400",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AppointmentCardProps {
  appointment: Appointment
  staffColor: string
  top: number
  height: number
  isDragging: boolean
  onCardPointerDown: (e: React.PointerEvent) => void
  onResizePointerDown: (e: React.PointerEvent) => void
  onEdit: () => void
  onDelete: () => void
  /** Callback for changing status via context menu */
  onStatusChange?: (status: AppointmentStatus) => void
  /** Navigate to customer profile */
  onGoToProfile?: () => void
  /** Whether this appointment has already been checked out/transacted */
  isCheckedOut?: boolean
}

export function AppointmentCard({
  appointment,
  staffColor,
  top,
  height,
  isDragging,
  onCardPointerDown,
  onResizePointerDown,
  onEdit,
  onDelete,
  onStatusChange,
  onGoToProfile,
  isCheckedOut = false,
}: AppointmentCardProps) {
  const startLabel = formatTime(minutesSinceMidnight(appointment.start_time))
  const endLabel   = formatTime(minutesSinceMidnight(appointment.end_time))

  const renderHeight = Math.max(height - 2, 22)

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [cancelAlertOpen, setCancelAlertOpen] = useState(false)

  const { hasRole } = useAuth()
  const canDeleteAppointment = hasRole(['super_admin', 'branch_admin'])
  const isAdmin = hasRole(['super_admin', 'branch_admin'])
  const isStaff = hasRole(['staff'])
  const canEdit = isStaff || isAdmin

  return (
    <>
      <AlertDialog open={cancelAlertOpen} onOpenChange={setCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-destructive" />
              Cancel this appointment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {appointment.title}
                {appointment.customer_name ? ` — ${appointment.customer_name}` : ""}
              </span>
              <br />
              Cancelling will remove this appointment. You can also reschedule it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Once cancelled, this appointment cannot be recovered.
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => {
                setCancelAlertOpen(false)
                onEdit()
              }}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Repeat className="h-3.5 w-3.5" />
              Reschedule instead
            </button>
            <AlertDialogCancel>Keep appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onStatusChange?.("cancelled")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-destructive" />
              Delete this appointment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {appointment.title}
                {appointment.customer_name ? ` — ${appointment.customer_name}` : ""}
              </span>
              <br />
              This action is permanent and cannot be undone. Were you trying to make a change instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Deleted appointments are removed permanently and cannot be recovered.
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => { setDeleteAlertOpen(false); onEdit() }}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit instead
            </button>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "absolute inset-x-1 rounded-md border-l-[3px] px-2 py-1 overflow-hidden",
            "shadow-sm select-none cursor-grab active:cursor-grabbing",
            "transition-[opacity,box-shadow] duration-150",
            isDragging
              ? "opacity-30 z-20"
              : "z-10 hover:shadow-md hover:z-20",
          )}
          style={{
            top,
            height: renderHeight,
            borderLeftColor: staffColor,
            backgroundColor: `${staffColor}18`,
          }}
          onPointerDown={onCardPointerDown}
        >
          {/* content */}
          <div className="flex items-start gap-1">
            <div
              className={cn(
                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                STATUS_DOT[appointment.status],
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight flex items-center">
                {appointment.location_type === "home_based" && (
                  <Home className="mr-1 h-3 w-3 text-blue-500" />
                )}
                {appointment.title}
                {appointment.recurrence_days && (
                  <Repeat className="ml-1 h-3 w-3 text-muted-foreground" />
                )}
              </p>
              {renderHeight > 40 && appointment.customer_name && (
                <p className="truncate text-[10px] text-muted-foreground">
                  {appointment.customer_name}
                </p>
              )}
              {renderHeight > 56 && (
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {startLabel} – {endLabel}
                </p>
              )}
            </div>
          </div>

          {/* resize handle (bottom edge) */}
          <div
            className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize rounded-b-md hover:bg-foreground/10"
            onPointerDown={(e) => {
              e.stopPropagation() // don't trigger the card drag
              onResizePointerDown(e)
            }}
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        {/* status submenu */}
        {onStatusChange && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2 flex justify-between items-center">
              Status
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={() => onStatusChange!("confirmed")}> 
                <CheckCircle className="h-4 w-4" />
                Confirmed
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onStatusChange!("in-progress")}> 
                <Play className="h-4 w-4" />
                In Progress
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onStatusChange!("completed")}> 
                <Check className="h-4 w-4" />
                Completed
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => setCancelAlertOpen(true)}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
                Cancelled
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {onGoToProfile && (
          <ContextMenuItem onClick={onGoToProfile} className="gap-2">
            <Home className="h-4 w-4" />
            Go to profile
          </ContextMenuItem>
        )}
        {canEdit && (
          <>
            <ContextMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit Appointment
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {!isCheckedOut && (
          <>
            <ContextMenuItem onClick={() => window.location.href = `/dashboard/checkout?appointmentId=${appointment.id}`} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Proceed to Checkout
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {isCheckedOut && (
          <>
            <ContextMenuItem disabled className="gap-2 text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Already checked out
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {canDeleteAppointment && (
          <ContextMenuItem
            onSelect={(e) => {
              e.preventDefault()
              if (appointment.recurrence_group_id) {
                // Recurring — go straight to the recurrence scope dialog
                onDelete()
              } else {
                setDeleteAlertOpen(true)
              }
            }}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete Appointment
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
    </>
  )
}
