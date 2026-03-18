/**
 * Calendar Settings Dialog
 * =======================
 *
 * Settings for work hours, lunch breaks, staff display, column sizing and staff schedules.
 * Allows configuration of:
 * - Work hours (start and end time for the calendar)
 * - Lunch break times (applies to all staff, all days)
 * - Column sizing mode (fit-to-screen or fixed-width)
 * - Staff working schedules (which staff work which days)
 */

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { TimePicker } from "@/components/ui/time-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { StaffMember } from "@/types/appointment"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarSettings {
  workHoursStart?: string  // HH:MM format  – e.g. "09:00"
  workHoursEnd?: string    // HH:MM format  – e.g. "18:00"
  lunchBreakStart?: string // HH:MM format
  lunchBreakEnd?: string   // HH:MM format
  staffSchedules?: Record<string, DayOfWeek[]>
  selectedStaff?: string[] // Array of staff IDs to display on calendar
  snapColumnsToFit?: boolean // True = columns expand to fill container width
}

type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"

const DAYS_OF_WEEK: { label: string; value: DayOfWeek }[] = [
  { label: "Monday", value: "MON" },
  { label: "Tuesday", value: "TUE" },
  { label: "Wednesday", value: "WED" },
  { label: "Thursday", value: "THU" },
  { label: "Friday", value: "FRI" },
  { label: "Saturday", value: "SAT" },
  { label: "Sunday", value: "SUN" },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalendarSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffMember[]
  settings?: CalendarSettings
  onSave: (settings: CalendarSettings) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarSettingsDialog({
  open,
  onOpenChange,
  staff,
  settings,
  onSave,
}: CalendarSettingsDialogProps) {
  const staffOnly = useMemo(
    () => staff.filter((member) => member.role?.toLowerCase() === "staff"),
    [staff]
  )

  const [workStart, setWorkStart] = useState(settings?.workHoursStart || "09:00")
  const [workEnd, setWorkEnd] = useState(settings?.workHoursEnd || "18:00")
  const [lunchStart, setLunchStart] = useState(settings?.lunchBreakStart || "12:00")
  const [lunchEnd, setLunchEnd] = useState(settings?.lunchBreakEnd || "13:00")
  const [snapToFit, setSnapToFit] = useState(settings?.snapColumnsToFit ?? true)
  const [staffDays, setStaffDays] = useState<Record<string, DayOfWeek[]>>(
    settings?.staffSchedules || initializeStaffDays()
  )
  const [selectedStaff, setSelectedStaff] = useState<string[]>(
    settings?.selectedStaff || staffOnly.map((s) => s.id)
  )
  const [staffSearch, setStaffSearch] = useState("")

  // Sync local state when settings prop changes (e.g. first load)
  useEffect(() => {
    if (settings) {
      setWorkStart(settings.workHoursStart || "09:00")
      setWorkEnd(settings.workHoursEnd || "18:00")
      setLunchStart(settings.lunchBreakStart || "12:00")
      setLunchEnd(settings.lunchBreakEnd || "13:00")
      setSnapToFit(settings.snapColumnsToFit ?? true)
      if (settings.selectedStaff) setSelectedStaff(settings.selectedStaff)
      if (settings.staffSchedules) setStaffDays(settings.staffSchedules)
    }
  }, [settings])

  function initializeStaffDays(): Record<string, DayOfWeek[]> {
    const result: Record<string, DayOfWeek[]> = {}
    staffOnly.forEach((s) => {
      // Default: all staff work all days
      result[s.id] = ["MON", "TUE", "WED", "THU", "FRI"]
    })
    return result
  }

  // Filter staff based on search
  const filteredStaff = staffOnly.filter(
    (s) =>
      s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.role?.toLowerCase().includes(staffSearch.toLowerCase())
  )

  const handleDayToggle = (staffId: string, day: DayOfWeek) => {
    setStaffDays((prev) => {
      const days = prev[staffId] || []
      if (days.includes(day)) {
        return {
          ...prev,
          [staffId]: days.filter((d) => d !== day),
        }
      } else {
        return {
          ...prev,
          [staffId]: [...days, day].sort((a, b) =>
            DAYS_OF_WEEK.findIndex((d) => d.value === a) -
            DAYS_OF_WEEK.findIndex((d) => d.value === b)
          ),
        }
      }
    })
  }

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaff((prev) => {
      if (prev.includes(staffId)) {
        return prev.filter((id) => id !== staffId)
      } else {
        return [...prev, staffId]
      }
    })
  }

  const handleSave = () => {
    const staffIds = new Set(staffOnly.map((s) => s.id))
    const filteredSelectedStaff = selectedStaff.filter((id) => staffIds.has(id))
    const filteredStaffDays = Object.fromEntries(
      Object.entries(staffDays).filter(([id]) => staffIds.has(id))
    ) as Record<string, DayOfWeek[]>

    onSave({
      workHoursStart: workStart,
      workHoursEnd: workEnd,
      lunchBreakStart: lunchStart,
      lunchBreakEnd: lunchEnd,
      staffSchedules: filteredStaffDays,
      selectedStaff: filteredSelectedStaff,
      snapColumnsToFit: snapToFit,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 h-[90vh] max-h-[860px]">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0 bg-background">
          <DialogTitle>Calendar Settings</DialogTitle>
          <DialogDescription>
            Configure work hours, lunch breaks, display preferences and staff schedules.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-5 py-4 pb-8">
            {/* -------- Work Hours Settings -------- */}
            <div className="space-y-3 border-b pb-6">
            <h3 className="text-sm font-semibold">Work Hours</h3>
            <p className="text-xs text-muted-foreground">
              Set the start and end hours for the calendar view. The calendar grid will display time slots within these hours.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opening Time</Label>
                <TimePicker
                  value={workStart}
                  onChange={setWorkStart}
                  minuteStep={30}
                />
              </div>
              <div className="space-y-2">
                <Label>Closing Time</Label>
                <TimePicker
                  value={workEnd}
                  onChange={setWorkEnd}
                  minuteStep={30}
                />
              </div>
            </div>
          </div>

            {/* -------- Lunch Break Settings -------- */}
            <div className="space-y-3 border-b pb-6">
            <h3 className="text-sm font-semibold">Lunch Break</h3>
            <p className="text-xs text-muted-foreground">
              Set the lunch break time. This will block time for all staff on all days.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lunch-start">Start Time</Label>
                <TimePicker
                  value={lunchStart}
                  onChange={setLunchStart}
                  minuteStep={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lunch-end">End Time</Label>
                <TimePicker
                  value={lunchEnd}
                  onChange={setLunchEnd}
                  minuteStep={15}
                />
              </div>
            </div>
          </div>

            {/* -------- Column Sizing (Snap Toggle) -------- */}
            <div className="space-y-3 border-b pb-6">
            <h3 className="text-sm font-semibold">Column Display</h3>
            <p className="text-xs text-muted-foreground">
              Control how staff columns are sized on the calendar grid.
            </p>

            <label className="flex items-center gap-3 cursor-pointer rounded-md p-2 hover:bg-accent">
              <Checkbox
                checked={snapToFit}
                onCheckedChange={(checked) => setSnapToFit(checked === true)}
              />
              <div>
                <p className="text-sm font-medium">Fit columns to screen</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, staff columns expand to fill the available width. When disabled, columns use a fixed 200px width with horizontal scrolling.
                </p>
              </div>
            </label>
          </div>

            {/* -------- Staff Display & Schedules (Combined) -------- */}
            <div className="space-y-3">
            <h3 className="text-sm font-semibold">Staff Members & Schedules</h3>
            <p className="text-xs text-muted-foreground">
              Select staff to display on the calendar and configure which days they work. Only staff working on the selected day will appear.
            </p>

            {/* Search field */}
            <div className="mb-4">
              <Input
                placeholder="Search staff by name or role..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="text-sm"
              />
            </div>

            <ScrollArea className="h-[250px] rounded-md border bg-muted/20 p-2">
              <div className="space-y-3 pr-4">
                {filteredStaff.length > 0 ? (
                filteredStaff.map((member) => (
                  <div
                    key={member.id}
                    className="space-y-2.5 rounded-lg border p-3 bg-card"
                  >
                    {/* Staff header with checkbox to show/hide */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedStaff.includes(member.id)}
                        onCheckedChange={() => handleStaffToggle(member.id)}
                        className="shrink-0"
                      />
                      {/* Staff color indicator - inline style necessary for dynamic colors */}
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: member.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        {member.role && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.role}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Day-of-week toggles */}
                    {selectedStaff.includes(member.id) && (
                      <div className="pt-1 pl-6 border-t">
                        <p className="text-[11px] font-medium text-muted-foreground mb-2">
                          Working Days:
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                          {DAYS_OF_WEEK.map((day) => (
                            <label
                              key={day.value}
                              className="flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                              <Checkbox
                                checked={
                                  staffDays[member.id]?.includes(day.value) || false
                                }
                                onCheckedChange={() =>
                                  handleDayToggle(member.id, day.value)
                                }
                              />
                              <span className="truncate">{day.label.slice(0, 3)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-muted-foreground py-4">
                  No staff members found.
                </p>
              )}
              </div>
            </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 border-t px-5 py-3 shrink-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
