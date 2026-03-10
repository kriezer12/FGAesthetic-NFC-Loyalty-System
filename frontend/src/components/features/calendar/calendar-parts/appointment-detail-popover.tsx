/**
 * Appointment Detail Popover
 * ==========================
 *
 * A read-only detail card that appears when left-clicking an appointment.
 * Displays appointment info (title, customer, staff, time, status, notes).
 * Positioned near the clicked card using Radix Popover.
 */

import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import type { Appointment, AppointmentStatus } from "@/types/appointment"
import { formatTime, minutesSinceMidnight } from "./calendar-utils"
import {
  Clock,
  User,
  UserRound,
  FileText,
  CircleDot,
  Repeat,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Status labels & colours
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  scheduled:     { label: "Scheduled",   className: "bg-yellow-100 text-yellow-800" },
  confirmed:     { label: "Confirmed",   className: "bg-green-100 text-green-800" },
  "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-800" },
  completed:     { label: "Completed",   className: "bg-gray-100 text-gray-800" },
  cancelled:     { label: "Cancelled",   className: "bg-red-100 text-red-800" },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AppointmentDetailPopoverProps {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pixel position for the anchor: { top, left } relative to viewport */
  anchorPosition: { top: number; left: number } | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppointmentDetailPopover({
  appointment,
  open,
  onOpenChange,
  anchorPosition,
}: AppointmentDetailPopoverProps) {
  if (!appointment || !anchorPosition) return null

  const startLabel = formatTime(minutesSinceMidnight(appointment.start_time))
  const endLabel = formatTime(minutesSinceMidnight(appointment.end_time))
  const status = STATUS_CONFIG[appointment.status]

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* Invisible anchor pinned to the click position */}
      <PopoverAnchor asChild>
        <span
          style={{
            position: "fixed",
            top: anchorPosition.top,
            left: anchorPosition.left,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>

      <PopoverContent
        side="right"
        sideOffset={8}
        align="start"
        className="w-72 p-0"
        onPointerDownOutside={() => onOpenChange(false)}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-sm font-semibold leading-tight">
            {appointment.title}
          </h4>
          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
          >
            <CircleDot className="h-3 w-3" />
            {status.label}
          </span>
        </div>

        <Separator />

        {/* Details */}
        <div className="grid gap-2.5 px-4 py-3 text-sm">
          {/* Time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {startLabel} – {endLabel}
            </span>
          </div>

          {/* Staff */}
          {appointment.staff_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>{appointment.staff_name}</span>
            </div>
          )}

          {/* Customer */}
          {appointment.customer_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span>{appointment.customer_name}</span>
            </div>
          )}

          {/* Recurrence */}
          {appointment.recurrence_days && appointment.recurrence_count && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Repeat className="h-3.5 w-3.5 shrink-0" />
              <span>
                Repeats every {appointment.recurrence_days} day(s)
                {appointment.recurrence_count > 1 &&
                  ` (${appointment.recurrence_count} times)`}
              </span>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-pre-wrap text-xs leading-relaxed">
                {appointment.notes}
              </span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
