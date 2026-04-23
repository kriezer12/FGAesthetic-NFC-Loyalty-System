/**
 * Appointment Detail Popover
 * ==========================
 *
 * A read-only detail card that appears when left-clicking an appointment.
 * Displays appointment info (title, customer, staff, time, status, notes).
 * Positioned near the clicked card using Radix Popover.
 */

import { useEffect, useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import type { Appointment, AppointmentStatus } from "@/types/appointment"
import { formatTime, minutesSinceMidnight } from "./calendar-utils"
import {
  Clock,
  Briefcase,
  User,
  FileText,
  CircleDot,
  Repeat,
  Home,
  Building2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Status labels & colours
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  scheduled:     { label: "Scheduled",   className: "bg-secondary/40 text-yellow-800" },
  confirmed:     { label: "Confirmed",   className: "bg-green-100 text-green-800" },
  "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-800" },
  completed:     { label: "Completed",   className: "bg-muted text-foreground" },
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
  const { userProfile } = useAuth()
  const [externalBranchName, setExternalBranchName] = useState<string | null>(null)

  const hasRenderableTarget = Boolean(appointment && anchorPosition)

  const startLabel = appointment ? formatTime(minutesSinceMidnight(appointment.start_time)) : ""
  const endLabel = appointment ? formatTime(minutesSinceMidnight(appointment.end_time)) : ""
  const status = appointment ? STATUS_CONFIG[appointment.status] : STATUS_CONFIG.scheduled
  const isViewingBranchScopedAppt =
    Boolean(appointment?.branch_id) &&
    (userProfile?.role === "super_admin" ||
      (userProfile?.role === "staff" &&
        Boolean(userProfile.branch_id) &&
        appointment?.branch_id !== userProfile.branch_id))

  useEffect(() => {
    let mounted = true

    const loadExternalBranchName = async () => {
      setExternalBranchName(null)
      if (!hasRenderableTarget || !isViewingBranchScopedAppt || !appointment?.branch_id) return

      const { data, error } = await supabase
        .from("branches")
        .select("name")
        .eq("id", appointment.branch_id)
        .maybeSingle()

      if (!mounted) return
      if (!error && data?.name) {
        setExternalBranchName(data.name)
      }
    }

    void loadExternalBranchName()

    return () => {
      mounted = false
    }
  }, [appointment?.branch_id, isViewingBranchScopedAppt, hasRenderableTarget])

  if (!hasRenderableTarget || !appointment || !anchorPosition) return null

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
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
            >
              <CircleDot className="h-3 w-3" />
              {status.label}
            </span>
            {appointment.location_type === "home_based" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px] font-medium">
                <Home className="h-3 w-3" />
                Home Service Appointment
              </span>
            )}
            {isViewingBranchScopedAppt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-medium">
                <Building2 className="h-3 w-3" />
                {`Cross-Branch: ${externalBranchName || "Other Branch"}`}
              </span>
            )}
          </div>
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

          {/* Staff & Customer */}
          <div className="flex flex-col gap-2">
            {/* Staff */}
            {appointment.staff_name && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-2.5 border border-blue-200 dark:border-blue-800">
                <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">Staff</p>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-medium text-foreground">{appointment.staff_name}</span>
                </div>
              </div>
            )}

            {/* Customer */}
            {appointment.customer_name && (
              <div className="rounded-md bg-primary/10 dark:bg-primary/20 p-2.5 border border-primary/30 dark:border-primary/90">
                <p className="text-[10px] font-semibold text-primary/80 dark:text-primary uppercase tracking-wide mb-1">Customer</p>
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-primary dark:text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground">{appointment.customer_name}</span>
                </div>
              </div>
            )}
          </div>

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
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-2 py-1.5">
                <p className="whitespace-pre-wrap break-all text-xs leading-relaxed text-muted-foreground">
                  {appointment.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
