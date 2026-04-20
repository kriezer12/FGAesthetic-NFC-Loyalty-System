/**
 * Calendar Grid
 * =============
 *
 * The scrollable day-view grid with:
 *   • Time labels (left gutter)
 *   • Staff columns with slot backgrounds
 *   • Absolutely-positioned appointment cards (drag-to-move, resize)
 *   • Blocked-time hatched overlays
 *   • Current-time indicator line
 *   • Click-on-empty-slot to create
 *   • Validation feedback toast
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
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
  getHeightFromDuration,
  getTopFromTime,
  hasBlockedTimeConflict,
  hasOverlap,
  isSameDay,
  isWithinWorkingHours,
  minutesSinceMidnight,
  setTimeOnDate,
  snapToInterval,
} from "./calendar-utils"
import {
  MIN_APPOINTMENT_DURATION,
  MINUTE_HEIGHT,
  TIME_GUTTER_WIDTH,
} from "./calendar-config"
import { AppointmentCard } from "./appointment-card"
import { AppointmentDetailPopover } from "./appointment-detail-popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface DragInfo {
  appointmentId: string
  type: "move" | "resize"
  startY: number          // pointer Y at start (relative to grid scroll)
  startX: number          // pointer clientX at start
  origTop: number         // card top at start (px)
  origHeight: number      // card height at start (px)
  origStaffIndex: number  // staff column index at start
  activated: boolean      // true once pointer moves past threshold
}

interface DragPreview {
  appointmentId: string
  top: number
  height: number
  staffIndex: number
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalendarGridProps {
  selectedDate: Date
  interval: IntervalMinutes
  clinicHours: ClinicHours
  staff: StaffMember[]
  appointments: Appointment[]
  blockedTimes: BlockedTime[]
  /** When true, columns stretch to fill the available width instead of fixed 200px */
  snapColumnsToFit?: boolean
  onAppointmentUpdate: (id: string, updates: Partial<Appointment>) => void
  onSlotClick: (staffId: string, startMinutes: number, date?: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
  onEditAppointment: (appointment: Appointment) => void
  onDeleteAppointment: (id: string) => void
  /** Set of appointment IDs that have already been checked out/transacted */
  checkedOutAppointmentIds?: Set<string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarGrid({
  selectedDate,
  interval,
  clinicHours,
  staff,
  appointments,
  blockedTimes,
  snapColumnsToFit = true,
  onAppointmentUpdate,
  onSlotClick,
  onAppointmentClick,
  onEditAppointment,
  onDeleteAppointment,
  checkedOutAppointmentIds,
}: CalendarGridProps) {
  const navigate = useNavigate()
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const lastPreviewRef = useRef<DragPreview | null>(null)
  const lastPointerEvent = useRef<{ clientX: number; clientY: number } | null>(null)

  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // ---- detail popover state ----
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailAnchor, setDetailAnchor] = useState<{ top: number; left: number } | null>(null)

  // Column width: fit-to-screen or fixed 200px
  const MIN_COL_WIDTH = 200

  // derived
  const timeSlots = useMemo(
    () => generateTimeSlots(clinicHours, interval),
    [clinicHours, interval],
  )
  const totalHeight = (clinicHours.close - clinicHours.open) * 60 * MINUTE_HEIGHT
  const slotHeight = interval * MINUTE_HEIGHT

  // ---- current-time indicator ----
  const isToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate])
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      if (!isToday) { setCurrentTimeTop(null); return }
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
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [clinicHours, isToday])

  // ---- auto-dismiss error ----
  useEffect(() => {
    if (!validationError) return
    const id = setTimeout(() => setValidationError(null), 3000)
    return () => clearTimeout(id)
  }, [validationError])

  // ========================================================================
  // Drag / Resize logic
  // ========================================================================

  useEffect(() => {
    const THRESHOLD = 4 // px before drag activates

    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !gridRef.current) return

      // activation gate
      if (!drag.activated) {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - (drag.startY - gridRef.current.scrollTop + gridRef.current.getBoundingClientRect().top)
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return
        drag.activated = true
      }

      const gridRect = gridRef.current.getBoundingClientRect()
      const scrollTop = gridRef.current.scrollTop

      if (drag.type === "move") {
        // ---- vertical position ----
        const mouseY = e.clientY - gridRect.top + scrollTop
        const deltaY = mouseY - drag.startY
        const rawTop = drag.origTop + deltaY
        const rawMinutes = rawTop / MINUTE_HEIGHT
        const snappedMinutes = snapToInterval(rawMinutes, interval)
        const snappedTop = snappedMinutes * MINUTE_HEIGHT
        const maxTop = totalHeight - drag.origHeight
        const clampedTop = Math.max(0, Math.min(maxTop, snappedTop))

        // ---- horizontal staff column ----
        const contentLeft = gridRect.left + TIME_GUTTER_WIDTH
        const contentWidth = gridRect.width - TIME_GUTTER_WIDTH
        const colWidth = contentWidth / staff.length
        const relX = e.clientX - contentLeft
        const staffIndex = Math.max(0, Math.min(staff.length - 1, Math.floor(relX / colWidth)))

        const preview: DragPreview = {
          appointmentId: drag.appointmentId,
          top: clampedTop,
          height: drag.origHeight,
          staffIndex,
        }

        if (
          preview.top !== lastPreviewRef.current?.top ||
          preview.staffIndex !== lastPreviewRef.current?.staffIndex
        ) {
          lastPreviewRef.current = preview
          setDragPreview(preview)
        }
      } else {
        // ---- resize ----
        // we stored startX as initial clientY for resize calculation
        const rawHeight = drag.origHeight + (e.clientY - drag.startX)
        const rawDuration = rawHeight / MINUTE_HEIGHT
        const snappedDuration = Math.max(
          MIN_APPOINTMENT_DURATION,
          snapToInterval(rawDuration, interval),
        )
        const snappedHeight = snappedDuration * MINUTE_HEIGHT
        const maxHeight = totalHeight - drag.origTop
        const clampedHeight = Math.min(snappedHeight, maxHeight)

        const preview: DragPreview = {
          appointmentId: drag.appointmentId,
          top: drag.origTop,
          height: clampedHeight,
          staffIndex: drag.origStaffIndex,
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

      // ---- click (not a drag) → show detail popover ----
      if (!drag.activated) {
        const appt = appointments.find((a) => a.id === drag.appointmentId)
        if (appt) {
          // Get click position from the last pointer event
          // We need the event — store it on pointerup
          setDetailAppointment(appt)
          setDetailAnchor({ top: (lastPointerEvent.current?.clientY ?? 0), left: (lastPointerEvent.current?.clientX ?? 0) })
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

      // ---- compute new times ----
      const openMin = clinicHours.open * 60
      const newStartMin = openMin + preview.top / MINUTE_HEIGHT
      const newEndMin = openMin + (preview.top + preview.height) / MINUTE_HEIGHT
      const newStaffId = staff[preview.staffIndex].id

      // validate working hours
      if (!isWithinWorkingHours(newStartMin, newEndMin, clinicHours)) {
        setValidationError("Cannot schedule outside clinic working hours.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      const appt = appointments.find((a) => a.id === drag.appointmentId)
      if (!appt) {
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      // validate overlaps
      const overlapType = hasOverlap(drag.appointmentId, newStaffId, appt.customer_id, newStartMin, newEndMin, selectedDate, appointments)
      if (overlapType) {
        setValidationError(overlapType === "customer" ? "This customer already has an appointment at this time." : "Time slot conflicts with another appointment.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      // validate blocked times
      if (hasBlockedTimeConflict(newStaffId, newStartMin, newEndMin, selectedDate, blockedTimes)) {
        setValidationError("Cannot schedule during a blocked time.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      // validate past date
      const apptDateOnly = new Date(selectedDate)
      apptDateOnly.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (apptDateOnly < today) {
        setValidationError("Cannot move appointments to past dates. Please select today or a future date.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      // commit
      const startDate = setTimeOnDate(selectedDate, newStartMin)
      const endDate = setTimeOnDate(selectedDate, newEndMin)

      onAppointmentUpdate(drag.appointmentId, {
        staff_id: newStaffId,
        staff_name: staff[preview.staffIndex].name,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
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
    staff,
    appointments,
    blockedTimes,
    selectedDate,
    onAppointmentUpdate,
    onAppointmentClick,
    totalHeight,
  ])

  // ---- start drag (move) ----
  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent, appointment: Appointment, staffIndex: number) => {
      if (!gridRef.current) return
      e.preventDefault()
      const gridRect = gridRef.current.getBoundingClientRect()
      const scrollTop = gridRef.current.scrollTop
      const mouseY = e.clientY - gridRect.top + scrollTop

      const top = getTopFromTime(appointment.start_time, clinicHours.open)
      const height = getHeightFromDuration(appointment.start_time, appointment.end_time)

      dragRef.current = {
        appointmentId: appointment.id,
        type: "move",
        startY: mouseY,
        startX: e.clientX,
        origTop: top,
        origHeight: height,
        origStaffIndex: staffIndex,
        activated: false,
      }
    },
    [clinicHours.open],
  )

  // ---- start resize ----
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, appointment: Appointment, staffIndex: number) => {
      e.preventDefault()
      const top = getTopFromTime(appointment.start_time, clinicHours.open)
      const height = getHeightFromDuration(appointment.start_time, appointment.end_time)

      dragRef.current = {
        appointmentId: appointment.id,
        type: "resize",
        startY: e.clientY,
        startX: e.clientY, // store initial clientY for delta calc
        origTop: top,
        origHeight: height,
        origStaffIndex: staffIndex,
        activated: false,
      }

      lastPreviewRef.current = {
        appointmentId: appointment.id,
        top,
        height,
        staffIndex,
      }
    },
    [clinicHours.open],
  )

  // ---- slot click (create) ----
  const handleSlotClick = useCallback(
    (staffIndex: number, slotMinutes: number) => {
      // skip if we just finished a drag
      if (dragRef.current) return
      
      const staffId = staff[staffIndex].id
      const slotEndMinutes = slotMinutes + interval
      
      // Check if this slot overlaps with any blocked time for this staff
      const isBlocked = blockedTimes.some((b) => {
        if (b.staff_id !== staffId) return false
        // Must be on the same day
        if (!isSameDay(new Date(b.start_time), selectedDate)) return false
        const bStart = minutesSinceMidnight(b.start_time)
        const bEnd = minutesSinceMidnight(b.end_time)
        return slotMinutes < bEnd && slotEndMinutes > bStart
      })
      
      // Don't open appointment dialog if the slot is blocked
      if (isBlocked) {
        setValidationError("Cannot create appointments during blocked time.")
        return
      }
      
      onSlotClick(staffId, slotMinutes)
    },
    [staff, interval, blockedTimes, selectedDate, onSlotClick],
  )

  // ---- filter appointments for the selected day ----
  const dayAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.start_time)
        return isSameDay(d, selectedDate)
      }),
    [appointments, selectedDate],
  )

  // ---- filter blocked times for the selected day ----
  const dayBlocked = useMemo(
    () =>
      blockedTimes.filter((b) => {
        const d = new Date(b.start_time)
        return isSameDay(d, selectedDate)
      }),
    [blockedTimes, selectedDate],
  )

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Sticky headers - outside scroll area */}
      <div className="flex border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20">
        <div
          className="shrink-0 border-r bg-background/95"
          style={{ width: TIME_GUTTER_WIDTH }}
        />
        {staff.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-1.5 border-r px-3 py-2"
            style={
              snapColumnsToFit
                ? { flex: `1 1 0%`, minWidth: `${MIN_COL_WIDTH}px` }
                : { width: `${MIN_COL_WIDTH}px`, minWidth: `${MIN_COL_WIDTH}px` }
            }
          >
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-tight">{s.name}</p>
              <p className="truncate text-[10px] text-muted-foreground leading-tight">
                {s.role}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid body */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div
          ref={gridRef}
          className={cn(
            "relative",
            dragPreview && "select-none cursor-grabbing",
          )}
          style={{
            minWidth: snapColumnsToFit
              ? undefined
              : `${TIME_GUTTER_WIDTH + staff.length * MIN_COL_WIDTH}px`,
            paddingTop: "0.5rem",
          }}
        >

      {/* -------- grid body -------- */}
      <div className="flex relative" style={{ height: totalHeight }}>
        {/* time labels */}
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
          {/* Closing hour label — always show the end-of-day time */}
          <div
            className="flex -translate-y-2.5 items-start justify-end pr-3"
            style={{ height: 0 }}
          >
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(clinicHours.close * 60)}
            </span>
          </div>
        </div>

        {/* staff columns */}
        {staff.map((s, staffIndex) => {
          const colAppts = dayAppointments.filter(
            (a) => a.staff_id === s.id && a.status !== "cancelled",
          )
          const colBlocked = dayBlocked.filter((b) => b.staff_id === s.id)

          return (
            <div
              key={s.id}
              className="relative border-r"
              style={
                snapColumnsToFit
                  ? { flex: `1 1 0%`, minWidth: `${MIN_COL_WIDTH}px` }
                  : { width: `${MIN_COL_WIDTH}px`, minWidth: `${MIN_COL_WIDTH}px` }
              }
            >
              {/* slot backgrounds */}
              {timeSlots.map((minutes) => (
                <div
                  key={minutes}
                  className="cursor-pointer border-b border-dashed transition-colors hover:bg-accent/30"
                  style={{ height: slotHeight }}
                  onClick={() => handleSlotClick(staffIndex, minutes)}
                />
              ))}

              {/* blocked-time overlays */}
              {colBlocked.map((block) => {
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
                    <span className="rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {block.reason}
                    </span>
                  </div>
                )
              })}

              {/* appointment cards */}
              {colAppts.map((appt) => {
                const top = getTopFromTime(appt.start_time, clinicHours.open)
                const height = getHeightFromDuration(appt.start_time, appt.end_time)
                const isDragging = dragPreview?.appointmentId === appt.id

                return (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    staffColor={s.color}
                    top={top}
                    height={height}
                    isDragging={isDragging}
                    onCardPointerDown={(e) =>
                      handleCardPointerDown(e, appt, staffIndex)
                    }
                    onResizePointerDown={(e) =>
                      handleResizePointerDown(e, appt, staffIndex)
                    }
                    onEdit={() => onEditAppointment(appt)}
                    onDelete={() => onDeleteAppointment(appt.id)}
                    onStatusChange={(status) => onAppointmentUpdate(appt.id, { status })}
                    onGoToProfile={() => {
                      if (!appt.customer_id) return
                      navigate("/dashboard/customers", {
                        state: {
                          customer: {
                            id: appt.customer_id,
                            name: appt.customer_name,
                          },
                          fromAppointment: true,
                        },
                      })
                    }}
                    isCheckedOut={checkedOutAppointmentIds?.has(appt.id) ?? false}
                  />
                )
              })}

              {/* drag preview ghost */}
              {dragPreview && dragPreview.staffIndex === staffIndex && (
                <div
                  className="pointer-events-none absolute inset-x-1 z-30 rounded-md border-2 border-dashed border-primary/60 bg-primary/10"
                  style={{ top: dragPreview.top, height: dragPreview.height }}
                />
              )}
            </div>
          )
        })}

        {/* current-time indicator */}
        {isToday && currentTimeTop !== null && (
          <div
            className="pointer-events-none absolute z-10 flex items-center"
            style={{
              top: currentTimeTop,
              left: TIME_GUTTER_WIDTH - 4,
              right: 0,
            }}
          >
            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
            <div className="flex-1 border-t-2 border-red-500" />
          </div>
        )}
      </div>

        {/* -------- validation error toast -------- */}
        {validationError && (
          <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-fit animate-in fade-in slide-in-from-bottom-2">
            <div className="pointer-events-auto rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white shadow-lg">
              {validationError}
            </div>
          </div>
        )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
