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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Pencil, Trash2, Repeat } from "lucide-react"

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
}: AppointmentCardProps) {
  const startLabel = formatTime(minutesSinceMidnight(appointment.start_time))
  const endLabel   = formatTime(minutesSinceMidnight(appointment.end_time))

  // render height with a 2 px gap so cards don't touch, min 22 px
  const renderHeight = Math.max(height - 2, 22)

  return (
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
        <ContextMenuItem onClick={onEdit} className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit Appointment
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete Appointment
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
