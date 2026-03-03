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
  onAppointmentUpdate: (id: string, updates: Partial<Appointment>) => void
  onSlotClick: (staffId: string, startMinutes: number) => void
  onAppointmentClick: (appointment: Appointment) => void
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
  onAppointmentUpdate,
  onSlotClick,
  onAppointmentClick,
}: CalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const lastPreviewRef = useRef<DragPreview | null>(null)

  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

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
        const deltaY = e.clientY - (drag.startY - gridRef.current.scrollTop + gridRect.top)
        // we stored startY in page coords for resize — recalc
        const rawHeight = drag.origHeight + (e.clientY - drag.startX) // startX stores initial clientY for resize
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

    const handlePointerUp = () => {
      const drag = dragRef.current
      if (!drag) return

      // ---- click (not a drag) → open appointment detail ----
      if (!drag.activated) {
        const appt = appointments.find((a) => a.id === drag.appointmentId)
        if (appt) onAppointmentClick(appt)
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

      // validate overlaps
      if (hasOverlap(drag.appointmentId, newStaffId, newStartMin, newEndMin, appointments)) {
        setValidationError("Time slot conflicts with another appointment.")
        dragRef.current = null
        lastPreviewRef.current = null
        setDragPreview(null)
        return
      }

      // validate blocked times
      if (hasBlockedTimeConflict(newStaffId, newStartMin, newEndMin, blockedTimes)) {
        setValidationError("Cannot schedule during a blocked time.")
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
      onSlotClick(staff[staffIndex].id, slotMinutes)
    },
    [staff, onSlotClick],
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
    <div
      ref={gridRef}
      className={cn(
        "flex-1 overflow-auto relative",
        dragPreview && "select-none cursor-grabbing",
      )}
    >
      {/* -------- sticky staff column headers -------- */}
      <div className="sticky top-0 z-20 flex border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          className="shrink-0 border-r bg-background/95"
          style={{ width: TIME_GUTTER_WIDTH }}
        />
        {staff.map((s) => (
          <div
            key={s.id}
            className="flex flex-1 items-center gap-2 border-r px-3 py-2"
          >
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">{s.role}</p>
            </div>
          </div>
        ))}
      </div>

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
        </div>

        {/* staff columns */}
        {staff.map((s, staffIndex) => {
          const colAppts = dayAppointments.filter(
            (a) => a.staff_id === s.id && a.status !== "cancelled",
          )
          const colBlocked = dayBlocked.filter((b) => b.staff_id === s.id)

          return (
            <div key={s.id} className="relative flex-1 border-r">
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
        <div className="pointer-events-none sticky bottom-4 z-50 mx-auto w-fit animate-in fade-in slide-in-from-bottom-2">
          <div className="pointer-events-auto rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white shadow-lg">
            {validationError}
          </div>
        </div>
      )}
    </div>
  )
}
