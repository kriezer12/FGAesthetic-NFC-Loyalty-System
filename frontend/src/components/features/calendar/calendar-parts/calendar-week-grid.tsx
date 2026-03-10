/**
 * Calendar Week Grid
 * ==================
 *
 * A 7-day week view with:
 *   • Day header row (click to jump to day view)
 *   • Absolutely-positioned appointment cards with cascading overlap layout
 *   • Left-click card → detail popover (read-only info)
 *   • Right-click card → context menu (Edit / Delete)
 *   • Drag-to-move: move cards across time rows AND day columns
 *   • Resize handle at card bottom for changing end time
 *   • Blocked-time hatched overlays
 *   • Current-time indicator line
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  Appointment,
  BlockedTime,
  ClinicHours,
  IntervalMinutes,
  StaffMember,
} from "@/types/appointment"
import {
  formatTime,
  generateTimeSlots,
  getTopFromTime,
  getHeightFromDuration,
  minutesSinceMidnight,
  isSameDay,
  snapToInterval,
  setTimeOnDate,
  isWithinWorkingHours,
  hasOverlap,
  hasBlockedTimeConflict,
} from "./calendar-utils"
import {
  MINUTE_HEIGHT,
  TIME_GUTTER_WIDTH,
  MIN_APPOINTMENT_DURATION,
} from "./calendar-config"
import { AppointmentDetailPopover } from "./appointment-detail-popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Pencil, Trash2, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  startOfWeek,
  addDays,
  format,
  isToday as isTodayFn,
} from "date-fns"

// ---------------------------------------------------------------------------
// Status dot colours
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-yellow-400",
  confirmed: "bg-green-400",
  "in-progress": "bg-blue-400",
  completed: "bg-gray-400",
  cancelled: "bg-red-400",
}

// ---------------------------------------------------------------------------
// Overlap layout helpers (cascading / nested style)
// ---------------------------------------------------------------------------

interface LayoutInfo {
  appointment: Appointment
  column: number    // depth (0 = first/widest card, 1 = indented, etc.)
}

/** Indent in pixels per nesting depth level */
const CASCADE_INDENT = 16

/**
 * Compute cascading layout for overlapping appointments.
 * The first card in each overlap cluster is full-width; subsequent
 * overlapping cards are progressively indented from the left, creating
 * a nested / stacked visual effect.
 */
function computeOverlapLayout(appts: Appointment[]): LayoutInfo[] {
  if (appts.length === 0) return []

  // Sort by start time, then longer durations first (so the "widest" card
  // gets depth 0 when two appointments start at the same time).
  const sorted = [...appts].sort((a, b) => {
    const diff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    if (diff !== 0) return diff
    return new Date(b.end_time).getTime() - new Date(a.end_time).getTime()
  })

  // For each appointment compute its depth: how many earlier (still-active)
  // appointments it overlaps with.
  const depth: number[] = new Array(sorted.length).fill(0)

  for (let i = 0; i < sorted.length; i++) {
    const startI = minutesSinceMidnight(sorted[i].start_time)
    let d = 0
    for (let j = 0; j < i; j++) {
      const endJ = minutesSinceMidnight(sorted[j].end_time)
      if (startI < endJ) {
        // i overlaps with j
        d = Math.max(d, depth[j] + 1)
      }
    }
    depth[i] = d
  }

  return sorted.map((appt, i) => ({
    appointment: appt,
    column: depth[i],
  }))
}

// ---------------------------------------------------------------------------
// Drag types
// ---------------------------------------------------------------------------

interface DragInfo {
  appointmentId: string
  type: "move" | "resize"
  /** Grid-relative Y (includes scrollTop) at drag start */
  startY: number
  /** clientY at drag start */
  startClientY: number
  /** clientX at drag start (for activation check) */
  startClientX: number
  origTop: number
  origHeight: number
  origDayIndex: number
  activated: boolean
}

interface DragPreview {
  appointmentId: string
  top: number
  height: number
  dayIndex: number
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalendarWeekGridProps {
  selectedDate: Date
  interval: IntervalMinutes
  clinicHours: ClinicHours
  staff: StaffMember[]
  appointments: Appointment[]
  blockedTimes: BlockedTime[]
  onSlotClick: (staffId: string, startMinutes: number) => void
  onAppointmentUpdate: (id: string, updates: Partial<Appointment>) => void
  onEditAppointment: (appointment: Appointment) => void
  onDeleteAppointment: (id: string) => void
  onDayClick: (date: Date) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarWeekGrid({
  selectedDate,
  interval,
  clinicHours,
  staff,
  appointments,
  blockedTimes,
  onSlotClick,
  onAppointmentUpdate,
  onEditAppointment,
  onDeleteAppointment,
  onDayClick,
}: CalendarWeekGridProps) {
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  )

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const timeSlots = useMemo(
    () => generateTimeSlots(clinicHours, interval),
    [clinicHours, interval],
  )

  const totalHeight = (clinicHours.close - clinicHours.open) * 60 * MINUTE_HEIGHT
  const slotHeight = interval * MINUTE_HEIGHT

  // ---- current-time indicator ----
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)
  const todayIndex = useMemo(
    () => weekDays.findIndex((d) => isTodayFn(d)),
    [weekDays],
  )

  useEffect(() => {
    const update = () => {
      if (todayIndex < 0) {
        setCurrentTimeTop(null)
        return
      }
      const now = new Date()
      const mins = minutesSinceMidnight(now)
      const open = clinicHours.open * 60
      const close = clinicHours.close * 60
      if (mins >= open && mins <= close) {
        setCurrentTimeTop((mins - open) * MINUTE_HEIGHT)
      } else {
        setCurrentTimeTop(null)
      }
    }
    update()
    const id = window.setInterval(update, 30_000)
    return () => window.clearInterval(id)
  }, [clinicHours, todayIndex])

  // Build a staff color lookup
  const staffColorMap = useMemo(() => {
    const map = new Map<string, string>()
    staff.forEach((s) => map.set(s.id, s.color))
    return map
  }, [staff])

  const staffNameMap = useMemo(() => {
    const map = new Map<string, string>()
    staff.forEach((s) => map.set(s.id, s.name))
    return map
  }, [staff])

  // Group appointments by day
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd")
      map.set(
        key,
        appointments.filter(
          (a) => a.status !== "cancelled" && isSameDay(new Date(a.start_time), day),
        ),
      )
    })
    return map
  }, [weekDays, appointments])

  // Group blocked times by day
  const blockedByDay = useMemo(() => {
    const map = new Map<string, BlockedTime[]>()
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd")
      map.set(
        key,
        blockedTimes.filter((b) => isSameDay(new Date(b.start_time), day)),
      )
    })
    return map
  }, [weekDays, blockedTimes])

  // Compute overlap layouts per day
  const layoutByDay = useMemo(() => {
    const map = new Map<string, LayoutInfo[]>()
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd")
      const dayAppts = appointmentsByDay.get(key) ?? []
      map.set(key, computeOverlapLayout(dayAppts))
    })
    return map
  }, [weekDays, appointmentsByDay])

  // ---- detail popover state ----
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailAnchor, setDetailAnchor] = useState<{ top: number; left: number } | null>(null)

  // ---- drag state ----
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const lastPreviewRef = useRef<DragPreview | null>(null)
  const lastPointerEvent = useRef<{ clientX: number; clientY: number } | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Auto-dismiss validation error
  useEffect(() => {
    if (!validationError) return
    const id = setTimeout(() => setValidationError(null), 3000)
    return () => clearTimeout(id)
  }, [validationError])

  // ========================================================================
  // Drag / Resize logic
  // ========================================================================

  useEffect(() => {
    const THRESHOLD = 4

    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !gridRef.current) return

      if (!drag.activated) {
        const dx = Math.abs(e.clientX - drag.startClientX)
        const dy = Math.abs(e.clientY - drag.startClientY)
        if (dx < THRESHOLD && dy < THRESHOLD) return
        drag.activated = true
      }

      const gridRect = gridRef.current.getBoundingClientRect()
      const scrollTop = gridRef.current.scrollTop
      const contentWidth = gridRect.width - TIME_GUTTER_WIDTH
      const colWidth = contentWidth / 7

      if (drag.type === "move") {
        const mouseY = e.clientY - gridRect.top + scrollTop
        const deltaY = mouseY - drag.startY
        const rawTop = drag.origTop + deltaY
        const snappedTop = snapToInterval(rawTop / MINUTE_HEIGHT, interval) * MINUTE_HEIGHT
        const clampedTop = Math.max(0, Math.min(totalHeight - drag.origHeight, snappedTop))

        const relX = e.clientX - gridRect.left - TIME_GUTTER_WIDTH
        const dayIndex = Math.max(0, Math.min(6, Math.floor(relX / colWidth)))

        const preview: DragPreview = {
          appointmentId: drag.appointmentId,
          top: clampedTop,
          height: drag.origHeight,
          dayIndex,
        }

        if (
          preview.top !== lastPreviewRef.current?.top ||
          preview.dayIndex !== lastPreviewRef.current?.dayIndex
        ) {
          lastPreviewRef.current = preview
          setDragPreview(preview)
        }
      } else {
        const rawHeight = drag.origHeight + (e.clientY - drag.startClientY)
        const snappedDuration = Math.max(
          MIN_APPOINTMENT_DURATION,
          snapToInterval(rawHeight / MINUTE_HEIGHT, interval),
        )
        const clampedHeight = Math.min(
          snappedDuration * MINUTE_HEIGHT,
          totalHeight - drag.origTop,
        )

        const preview: DragPreview = {
          appointmentId: drag.appointmentId,
          top: drag.origTop,
          height: clampedHeight,
          dayIndex: drag.origDayIndex,
        }

        if (preview.height !== lastPreviewRef.current?.height) {
          lastPreviewRef.current = preview
          setDragPreview(preview)
        }
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      lastPointerEvent.current = { clientX: e.clientX, clientY: e.clientY }
      const drag = dragRef.current
      if (!drag) return

      // Click (no drag) → show detail popover
      if (!drag.activated) {
        const appt = appointments.find((a) => a.id === drag.appointmentId)
        if (appt) {
          setDetailAppointment(appt)
          setDetailAnchor({
            top: lastPointerEvent.current?.clientY ?? 0,
            left: lastPointerEvent.current?.clientX ?? 0,
          })
          setDetailOpen(true)
        }
        dragRef.current = null
        return
      }

      const preview = lastPreviewRef.current
      if (!preview) {
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      const openMin = clinicHours.open * 60
      const newStartMin = openMin + preview.top / MINUTE_HEIGHT
      const newEndMin = openMin + (preview.top + preview.height) / MINUTE_HEIGHT
      const targetDay = weekDays[preview.dayIndex]

      const appt = appointments.find((a) => a.id === drag.appointmentId)
      if (!appt) {
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      if (!isWithinWorkingHours(newStartMin, newEndMin, clinicHours)) {
        setValidationError("Cannot schedule outside clinic working hours.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      if (hasOverlap(drag.appointmentId, appt.staff_id, newStartMin, newEndMin, targetDay, appointments)) {
        setValidationError("Time slot conflicts with another appointment.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      if (hasBlockedTimeConflict(appt.staff_id, newStartMin, newEndMin, targetDay, blockedTimes)) {
        setValidationError("Cannot schedule during a blocked time.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      onAppointmentUpdate(drag.appointmentId, {
        start_time: setTimeOnDate(targetDay, newStartMin).toISOString(),
        end_time: setTimeOnDate(targetDay, newEndMin).toISOString(),
      })

      dragRef.current = null
      lastPreviewRef.current = null
      setDragPreview(null)
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [
    interval,
    clinicHours,
    appointments,
    blockedTimes,
    weekDays,
    totalHeight,
    onAppointmentUpdate,
  ])

  // ---- start move drag ----
  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent, appt: Appointment, dayIndex: number) => {
      if (!gridRef.current) return
      e.preventDefault()
      e.stopPropagation()
      const gridRect = gridRef.current.getBoundingClientRect()
      const scrollTop = gridRef.current.scrollTop
      const mouseY = e.clientY - gridRect.top + scrollTop
      const top = getTopFromTime(appt.start_time, clinicHours.open)
      const height = getHeightFromDuration(appt.start_time, appt.end_time)
      dragRef.current = {
        appointmentId: appt.id,
        type: "move",
        startY: mouseY,
        startClientY: e.clientY,
        startClientX: e.clientX,
        origTop: top,
        origHeight: height,
        origDayIndex: dayIndex,
        activated: false,
      }
    },
    [clinicHours.open],
  )

  // ---- start resize ----
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, appt: Appointment, dayIndex: number) => {
      e.preventDefault()
      e.stopPropagation()
      const top = getTopFromTime(appt.start_time, clinicHours.open)
      const height = getHeightFromDuration(appt.start_time, appt.end_time)
      dragRef.current = {
        appointmentId: appt.id,
        type: "resize",
        startY: e.clientY,
        startClientY: e.clientY,
        startClientX: e.clientX,
        origTop: top,
        origHeight: height,
        origDayIndex: dayIndex,
        activated: false,
      }
      lastPreviewRef.current = { appointmentId: appt.id, top, height, dayIndex }
    },
    [clinicHours.open],
  )

  const MIN_COL_WIDTH = 120

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Sticky day headers */}
      <div className="flex border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20">
        <div
          className="shrink-0 border-r bg-background/95"
          style={{ width: TIME_GUTTER_WIDTH }}
        />
        {weekDays.map((day, i) => {
          const today = isTodayFn(day)
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-center border-r px-2 py-2 cursor-pointer hover:bg-accent/30 transition-colors",
                today && "bg-primary/5",
              )}
              style={{ flex: "1 1 0%", minWidth: MIN_COL_WIDTH }}
              onClick={() => onDayClick(day)}
            >
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  today && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid body */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div
          ref={gridRef}
          className={cn(
            "relative",
            dragPreview && "select-none cursor-grabbing",
          )}
          style={{ paddingTop: "0.5rem" }}
        >
          <div className="flex relative" style={{ height: totalHeight }}>
            {/* Time labels */}
            <div className="shrink-0 border-r" style={{ width: TIME_GUTTER_WIDTH }}>
              {timeSlots.map((minutes) => (
                <div
                  key={minutes}
                  className="flex -translate-y-2.5 items-start justify-end pr-3"
                  style={{ height: slotHeight }}
                >
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatTime(minutes)}
                  </span>
                </div>
              ))}
              <div
                className="flex -translate-y-2.5 items-start justify-end pr-3"
                style={{ height: 0 }}
              >
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatTime(clinicHours.close * 60)}
                </span>
              </div>
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const key = format(day, "yyyy-MM-dd")
              const dayLayout = layoutByDay.get(key) ?? []
              const dayBlocked = blockedByDay.get(key) ?? []
              const today = isTodayFn(day)

              return (
                <div
                  key={key}
                  className={cn(
                    "relative border-r",
                    today && "bg-primary/[0.02]",
                  )}
                  style={{ flex: "1 1 0%", minWidth: MIN_COL_WIDTH }}
                >
                  {/* Slot backgrounds (click to create appointment) */}
                  {timeSlots.map((minutes) => (
                    <div
                      key={minutes}
                      className="cursor-pointer border-b border-dashed transition-colors hover:bg-accent/30"
                      style={{ height: slotHeight }}
                      onClick={() => {
                        if (dragRef.current) return
                        if (staff.length > 0) onSlotClick(staff[0].id, minutes)
                      }}
                    />
                  ))}

                  {/* Blocked-time hatched overlays */}
                  {dayBlocked.map((block) => {
                    const top = getTopFromTime(block.start_time, clinicHours.open)
                    const height = getHeightFromDuration(block.start_time, block.end_time)
                    return (
                      <div
                        key={block.id}
                        className="pointer-events-none absolute inset-x-0 z-[5] flex items-center justify-center"
                        style={{
                          top,
                          height,
                          background:
                            "repeating-linear-gradient(-45deg, transparent, transparent 4px, var(--border) 4px, var(--border) 5px)",
                        }}
                      >
                        <span className="rounded bg-background/80 px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {block.reason}
                        </span>
                      </div>
                    )
                  })}

                  {/* Appointment cards — cascading layout with drag/resize */}
                  {dayLayout.map(({ appointment: appt, column }) => {
                    const isDragging = dragPreview?.appointmentId === appt.id

                    // While dragging to a different day, hide the card in its original column
                    if (isDragging && dragPreview?.dayIndex !== dayIndex) return null

                    const top = isDragging && dragPreview
                      ? dragPreview.top
                      : getTopFromTime(appt.start_time, clinicHours.open)
                    const height = isDragging && dragPreview
                      ? dragPreview.height
                      : getHeightFromDuration(appt.start_time, appt.end_time)
                    const renderHeight = Math.max(height - 2, 20)
                    const color = staffColorMap.get(appt.staff_id) ?? "#6366f1"
                    const leftOffset = column * CASCADE_INDENT
                    const zIndex = isDragging ? 50 : 10 + column

                    return (
                      <ContextMenu key={appt.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            className={cn(
                              "absolute overflow-hidden rounded-md border-l-[3px] px-1 py-0.5 shadow-sm transition-shadow",
                              isDragging
                                ? "cursor-grabbing shadow-lg opacity-90"
                                : "cursor-grab hover:shadow-md hover:z-30",
                            )}
                            style={{
                              top,
                              height: renderHeight,
                              left: leftOffset,
                              right: 4,
                              zIndex,
                              borderLeftColor: color,
                              backgroundColor: `color-mix(in srgb, ${color} 22%, var(--background) 78%)`,
                            }}
                            onPointerDown={(e) => {
                              if (e.button !== 0) return
                              handleCardPointerDown(e, appt, dayIndex)
                            }}
                          >
                            <div className="flex items-start gap-1 h-full">
                              <div
                                className={cn(
                                  "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                  STATUS_DOT[appt.status] ?? "bg-gray-400",
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-semibold leading-tight flex items-center gap-0.5">
                                  {appt.title}
                                  {appt.recurrence_days && (
                                    <Repeat className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                  )}
                                </p>
                                {renderHeight > 30 && (
                                  <p className="truncate text-[9px] text-muted-foreground">
                                    {staffNameMap.get(appt.staff_id) ?? appt.staff_name}
                                  </p>
                                )}
                                {renderHeight > 44 && (
                                  <p className="text-[9px] tabular-nums text-muted-foreground">
                                    {formatTime(minutesSinceMidnight(appt.start_time))} –{" "}
                                    {formatTime(minutesSinceMidnight(appt.end_time))}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Resize handle at bottom */}
                            {renderHeight > 24 && (
                              <div
                                className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize hover:bg-black/10 rounded-b-md"
                                onPointerDown={(e) => handleResizePointerDown(e, appt, dayIndex)}
                              />
                            )}
                          </div>
                        </ContextMenuTrigger>

                        <ContextMenuContent className="w-48">
                          <ContextMenuItem
                            onClick={() => onEditAppointment(appt)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Appointment
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => onDeleteAppointment(appt.id)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Appointment
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    )
                  })}

                  {/* Drag preview ghost — shown in target day column */}
                  {dragPreview && dragPreview.dayIndex === dayIndex && (
                    <div
                      className="pointer-events-none absolute inset-x-1 z-40 rounded-md border-2 border-dashed border-primary/60 bg-primary/10"
                      style={{ top: dragPreview.top, height: dragPreview.height }}
                    />
                  )}

                  {/* Current-time indicator */}
                  {dayIndex === todayIndex && currentTimeTop !== null && (
                    <div
                      className="pointer-events-none absolute z-20 flex items-center"
                      style={{ top: currentTimeTop, left: -4, right: 0 }}
                    >
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Validation error toast */}
      {validationError && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-fit animate-in fade-in slide-in-from-bottom-2">
          <div className="pointer-events-auto rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white shadow-lg">
            {validationError}
          </div>
        </div>
      )}

      {/* Appointment detail popover (shown on left-click) */}
      <AppointmentDetailPopover
        appointment={detailAppointment}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailAppointment(null)
        }}
        anchorPosition={detailAnchor}
      />
    </div>
  )
}
