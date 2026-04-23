import { useCallback, useEffect, useMemo, useState } from "react"
import { Calendar, Settings2, Clock, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimePicker12Hour } from "@/components/ui/time-picker-12h"
import { NotificationToast } from "@/components/ui/notification-toast"
import { fetchAppointmentSettings, saveAppointmentSettings, type AppointmentSettings } from "@/services/appointment-settings"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"
import { supabase } from "@/lib/supabase"

const defaultSettings: AppointmentSettings = {
  default_duration: 60,
  buffer_time: 15,
  max_daily_appointments: 20,
  cancellation_notice: 24,
  enable_reschedule: true,
  enable_auto_reminder: true,
  working_hours_start: "09:00",
  working_hours_end: "18:00",
  lunch_break_start: "12:00",
  lunch_break_end: "13:00",
}

type CrossBranchAssignment = {
  id: string
  staff_id: string
  staff_name?: string | null
  home_branch_id?: string | null
  home_branch_name?: string | null
  host_branch_id: string
  host_branch_name?: string | null
  starts_at: string
  ends_at: string
  reason: string
  status: "active" | "upcoming" | "expired" | "cancelled"
  computed_status?: "active" | "upcoming" | "expired" | "cancelled"
  created_by_name?: string | null
  home_branch_admin_name?: string | null
  cancelled_reason?: string | null
}

type CandidateStaff = {
  id: string
  full_name: string
  branch_id?: string | null
  branch_name?: string | null
}

type BranchOption = {
  id: string
  name: string
}

type BranchRow = {
  id: string
  name: string
}

const toDatetimeLocalInput = (iso?: string | null) => {
  if (!iso) return ""
  const date = new Date(iso)
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

const combineDateAndTime = (date: Date | undefined, time: string) => {
  if (!date) return ""
  const [hours, minutes] = time.split(":").map((value) => Number(value))
  const combined = new Date(date)
  combined.setHours(hours || 0, minutes || 0, 0, 0)
  return combined.toISOString()
}

export default function AppointmentsSettingsPage() {
  const { userProfile, session } = useAuth()
  const [settings, setSettings] = useState<AppointmentSettings>(defaultSettings)
  const [changes, setChanges] = useState<Partial<AppointmentSettings>>({})
  const [toast, setToast] = useState<{ id: string; title: string; message: string; type: "warning" | "success" } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [assignments, setAssignments] = useState<CrossBranchAssignment[]>([])
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [assignmentCancellingId, setAssignmentCancellingId] = useState<string | null>(null)
  const [staffCandidates, setStaffCandidates] = useState<CandidateStaff[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])

  const [assignmentStaffId, setAssignmentStaffId] = useState("")
  const [assignmentHostBranchId, setAssignmentHostBranchId] = useState("")
  const [assignmentStartsDate, setAssignmentStartsDate] = useState<Date | undefined>()
  const [assignmentEndsDate, setAssignmentEndsDate] = useState<Date | undefined>()
  const [assignmentStartsTime, setAssignmentStartsTime] = useState("09:00")
  const [assignmentEndsTime, setAssignmentEndsTime] = useState("17:00")
  const [assignmentReason, setAssignmentReason] = useState("")
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<"all" | "active" | "upcoming" | "expired" | "cancelled">("all")

  const canManageAssignments = userProfile?.role === "super_admin" || userProfile?.role === "branch_admin"
  const isSuperAdmin = userProfile?.role === "super_admin"

  useEffect(() => {
    document.title = "Appointments - FG Aesthetic Centre"
  }, [])

  useEffect(() => {
    if (!canManageAssignments || !session) return

    const loadBranches = async () => {
      const { data, error } = await supabase.from("branches").select("id, name").order("name")
      if (error) return
      const rows = ((data || []) as BranchRow[]).map((b) => ({ id: b.id, name: b.name }))
      setBranches(rows)
    }

    void loadBranches()
  }, [canManageAssignments, session])

  useEffect(() => {
    if (!canManageAssignments) return

    if (isSuperAdmin) {
      setAssignmentHostBranchId((prev) => prev || "")
      return
    }

    setAssignmentHostBranchId(userProfile?.branch_id || "")
  }, [canManageAssignments, isSuperAdmin, userProfile?.branch_id])

  const filteredAssignments = useMemo(() => {
    if (assignmentStatusFilter === "all") return assignments
    return assignments.filter((row) => (row.computed_status || row.status) === assignmentStatusFilter)
  }, [assignments, assignmentStatusFilter])

  const loadAssignmentData = useCallback(async () => {
    if (!canManageAssignments || !session) return

    setAssignmentLoading(true)
    try {
      const [candidatesRes, assignmentsRes] = await Promise.all([
        apiCall("/staff/cross-branch-candidates", {
          method: "GET",
          authToken: session.access_token,
        }),
        apiCall("/staff/cross-branch-assignments", {
          method: "GET",
          authToken: session.access_token,
        }),
      ])

      const candidatesJson = await candidatesRes.json()
      if (!candidatesRes.ok) {
        throw new Error(candidatesJson?.error || "Failed to load candidate staff")
      }

      const assignmentsJson = await assignmentsRes.json()
      if (!assignmentsRes.ok) {
        throw new Error(assignmentsJson?.error || "Failed to load cross-branch assignments")
      }

      setStaffCandidates((candidatesJson?.staff || []) as CandidateStaff[])
      setAssignments((assignmentsJson?.assignments || []) as CrossBranchAssignment[])
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        title: "Load Error",
        message: error instanceof Error ? error.message : "Failed to load cross-branch assignments.",
        type: "warning",
      })
    } finally {
      setAssignmentLoading(false)
    }
  }, [canManageAssignments, session])

  useEffect(() => {
    void loadAssignmentData()
  }, [loadAssignmentData])

  const createAssignment = async () => {
    if (!session) return
    if (!assignmentStaffId || !assignmentStartsDate || !assignmentEndsDate || !assignmentReason.trim()) {
      setToast({
        id: crypto.randomUUID(),
        title: "Validation Error",
        message: "Staff, start, end, and reason are required.",
        type: "warning",
      })
      return
    }

    if (isSuperAdmin && !assignmentHostBranchId) {
      setToast({
        id: crypto.randomUUID(),
        title: "Validation Error",
        message: "Please select a borrowing branch.",
        type: "warning",
      })
      return
    }

    const startsIso = combineDateAndTime(assignmentStartsDate, assignmentStartsTime)
    const endsIso = combineDateAndTime(assignmentEndsDate, assignmentEndsTime)
    if (!startsIso || !endsIso || new Date(endsIso) <= new Date(startsIso)) {
      setToast({
        id: crypto.randomUUID(),
        title: "Validation Error",
        message: "End date/time must be after start date/time.",
        type: "warning",
      })
      return
    }

    setAssignmentSaving(true)
    try {
      const response = await apiCall("/staff/cross-branch-assignments", {
        method: "POST",
        authToken: session.access_token,
        body: JSON.stringify({
          staff_id: assignmentStaffId,
          host_branch_id: assignmentHostBranchId || null,
          starts_at: startsIso,
          ends_at: endsIso,
          reason: assignmentReason.trim(),
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.error || "Failed to create assignment")
      }

      setToast({
        id: crypto.randomUUID(),
        title: "Success",
        message: "Temporary cross-branch assignment created.",
        type: "success",
      })

      setAssignmentStaffId("")
      setAssignmentStartsDate(undefined)
      setAssignmentEndsDate(undefined)
      setAssignmentStartsTime("09:00")
      setAssignmentEndsTime("17:00")
      setAssignmentReason("")
      await loadAssignmentData()
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create assignment.",
        type: "warning",
      })
    } finally {
      setAssignmentSaving(false)
    }
  }

  const cancelAssignment = async (assignmentId: string) => {
    if (!session) return
    setAssignmentCancellingId(assignmentId)
    try {
      const response = await apiCall(`/staff/cross-branch-assignments/${assignmentId}/cancel`, {
        method: "PATCH",
        authToken: session.access_token,
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.error || "Failed to cancel assignment")
      }

      setToast({
        id: crypto.randomUUID(),
        title: "Success",
        message: "Assignment cancelled.",
        type: "success",
      })
      await loadAssignmentData()
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to cancel assignment.",
        type: "warning",
      })
    } finally {
      setAssignmentCancellingId(null)
    }
  }

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const loadedSettings = await fetchAppointmentSettings()
        setSettings(loadedSettings)
      } catch (error) {
        console.error("Error loading settings:", error)
        setToast({
          id: crypto.randomUUID(),
          title: "Load Error",
          message: "Could not load settings from database, using defaults.",
          type: "warning",
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleChange = <K extends keyof AppointmentSettings>(key: K, value: AppointmentSettings[K]) => {
    setChanges((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const getCurrentValue = <K extends keyof AppointmentSettings>(key: K): AppointmentSettings[K] => {
    return key in changes ? (changes[key] as AppointmentSettings[K]) : settings[key]
  }

  const saveSettings = async () => {
    const duration = Number(getCurrentValue("default_duration"))
    const buffer = Number(getCurrentValue("buffer_time"))
    const maxDaily = Number(getCurrentValue("max_daily_appointments"))
    const notice = Number(getCurrentValue("cancellation_notice"))

    if (!Number.isFinite(duration) || duration <= 0) {
      setToast({
        id: crypto.randomUUID(),
        title: "Validation Error",
        message: "Default duration must be a positive number.",
        type: "warning",
      })
      return
    }

    if (!Number.isFinite(buffer) || buffer < 0) {
      setToast({
        id: crypto.randomUUID(),
        title: "Validation Error",
        message: "Buffer time cannot be negative.",
        type: "warning",
      })
      return
    }

    if (!Number.isFinite(maxDaily) || maxDaily <= 0) {
      setToast({
        id: crypto.randomUUID(),
        title: "Validation Error",
        message: "Max daily appointments must be a positive number.",
        type: "warning",
      })
      return
    }

    if (!Number.isFinite(notice) || notice < 0) {
      setToast({
        id: crypto.randomUUID(),
        title: "Validation Error",
        message: "Cancellation notice must be non-negative.",
        type: "warning",
      })
      return
    }

    const newSettings = { ...settings, ...changes }
    setIsSaving(true)
    
    try {
      const result = await saveAppointmentSettings(newSettings)
      
      if (result.success) {
        setSettings(newSettings)
        setChanges({})
        setToast({
          id: crypto.randomUUID(),
          title: "Success",
          message: result.error || "Appointment settings saved successfully.",
          type: "success",
        })
      } else {
        setToast({
          id: crypto.randomUUID(),
          title: "Error",
          message: result.error || "Failed to save settings.",
          type: "warning",
        })
      }
    } catch (error) {
      console.error("Save error:", error)
      setToast({
        id: crypto.randomUUID(),
        title: "Error",
        message: "Failed to save settings. Please try again.",
        type: "warning",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Reset all appointment settings to defaults?")
      if (!confirmed) return
    }
    
    setSettings(defaultSettings)
    setChanges({})
    
    // Also save defaults to database
    saveAppointmentSettings(defaultSettings).then(() => {
      setToast({
        id: crypto.randomUUID(),
        title: "Success",
        message: "Settings reset to defaults.",
        type: "success",
      })
    })
  }

  const hasChanges = Object.keys(changes).length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="pointer-events-none fixed top-4 right-4 z-[100] flex max-w-[400px] flex-col items-end gap-3">
          <NotificationToast
            id={toast.id}
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Calendar className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Appointments</h1>
      </div>

      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cross-Branch Temporary Staff Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageAssignments ? (
            <p className="text-sm text-muted-foreground">Only borrowing branch admins and super admins can manage temporary cross-branch assignments.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Borrowed Staff</label>
                  <Select value={assignmentStaffId} onValueChange={setAssignmentStaffId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffCandidates.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.full_name} {row.branch_name ? `(${row.branch_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Borrowing Branch</label>
                  <Select value={assignmentHostBranchId} onValueChange={setAssignmentHostBranchId} disabled={!isSuperAdmin}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((row) => (
                        <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Start Date</label>
                  <DatePicker
                    value={assignmentStartsDate}
                    onChange={setAssignmentStartsDate}
                    placeholder="Pick start date"
                    captionLayout="dropdown"
                  />
                  <div className="mt-2">
                    <TimePicker12Hour
                      color="primary"
                      label="Start Time"
                      value={assignmentStartsTime}
                      onChange={setAssignmentStartsTime}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">End Date</label>
                  <DatePicker
                    value={assignmentEndsDate}
                    onChange={setAssignmentEndsDate}
                    placeholder="Pick end date"
                    captionLayout="dropdown"
                  />
                  <div className="mt-2">
                    <TimePicker12Hour
                      color="primary"
                      label="End Time"
                      value={assignmentEndsTime}
                      onChange={setAssignmentEndsTime}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Reason</label>
                <Input
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  placeholder="Reason for temporary borrowing"
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={createAssignment} disabled={assignmentSaving || assignmentLoading}>
                  {assignmentSaving ? "Assigning..." : "Create Assignment"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Current Assignments</p>
                <div className="flex items-center gap-2">
                  <Select value={assignmentStatusFilter} onValueChange={(value) => setAssignmentStatusFilter(value as "all" | "active" | "upcoming" | "expired" | "cancelled") }>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadAssignmentData()} disabled={assignmentLoading}>
                    {assignmentLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Staff</th>
                      <th className="px-3 py-2 text-left">Route</th>
                      <th className="px-3 py-2 text-left">Window</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Reason</th>
                      <th className="px-3 py-2 text-left">Home Admin</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-5 text-center text-muted-foreground">No assignments found.</td>
                      </tr>
                    ) : (
                      filteredAssignments.map((row) => {
                        const status = row.computed_status || row.status
                        return (
                          <tr key={row.id} className="border-t">
                            <td className="px-3 py-2">{row.staff_name || "Unknown"}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <span>{row.home_branch_name || "Unknown"} -&gt; {row.host_branch_name || "Unknown"}</span>
                                {row.home_branch_admin_name && (
                                  <Badge variant="outline" className="w-fit text-[10px] font-medium">
                                    Original admin: {row.home_branch_admin_name}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">{toDatetimeLocalInput(row.starts_at).replace("T", " ")} to {toDatetimeLocalInput(row.ends_at).replace("T", " ")}</td>
                            <td className="px-3 py-2 capitalize">{status}</td>
                            <td className="px-3 py-2">{row.reason}</td>
                            <td className="px-3 py-2">{row.home_branch_admin_name || "-"}</td>
                            <td className="px-3 py-2 text-right">
                              {status !== "cancelled" && status !== "expired" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={assignmentCancellingId === row.id}
                                  onClick={() => void cancelAssignment(row.id)}
                                >
                                  {assignmentCancellingId === row.id ? "Cancelling..." : "Cancel"}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Appointments</h2>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Duration & Timing */}
        <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-primary" />
              Duration & Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Duration (min)</label>
              <Input
                type="number"
                min="15"
                max="480"
                step="15"
                value={String(getCurrentValue("default_duration"))}
                onChange={(e) => handleChange("default_duration", parseInt(e.target.value))}
                className="bg-primary/10 border-2 border-primary/30 focus-visible:border-primary/60 focus-visible:ring-primary/50 focus-visible:bg-primary/15 hover:border-primary/50 hover:bg-primary/15 px-3 py-2 text-sm font-semibold transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Buffer (min)</label>
              <Input
                type="number"
                min="0"
                max="120"
                step="5"
                value={String(getCurrentValue("buffer_time"))}
                onChange={(e) => handleChange("buffer_time", parseInt(e.target.value))}
                className="bg-primary/10 border-2 border-primary/30 focus-visible:border-primary/60 focus-visible:ring-primary/50 focus-visible:bg-primary/15 hover:border-primary/50 hover:bg-primary/15 px-3 py-2 text-sm font-semibold transition-colors"
              />
            </div>

            <div>
              <TimePicker12Hour
                color="primary"
                label="Start Time"
                value={String(getCurrentValue("working_hours_start"))}
                onChange={(value) => handleChange("working_hours_start", value)}
              />
            </div>

            <div>
              <TimePicker12Hour
                color="primary"
                label="Lunch Break Start"
                value={String(getCurrentValue("lunch_break_start"))}
                onChange={(value) => handleChange("lunch_break_start", value)}
              />
            </div>

            <div>
              <TimePicker12Hour
                color="primary"
                label="Lunch Break End"
                value={String(getCurrentValue("lunch_break_end"))}
                onChange={(value) => handleChange("lunch_break_end", value)}
              />
            </div>

            <div>
              <TimePicker12Hour
                color="primary"
                label="End Time"
                value={String(getCurrentValue("working_hours_end"))}
                onChange={(value) => handleChange("working_hours_end", value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Capacity & Policy */}
        <Card className="border-2 border-accent/40 bg-gradient-to-br from-accent/5 to-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-5 w-5 text-accent" />
              Capacity & Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Max Daily Appointments</label>
              <Input
                type="number"
                min="1"
                max="100"
                step="1"
                value={String(getCurrentValue("max_daily_appointments"))}
                onChange={(e) => handleChange("max_daily_appointments", parseInt(e.target.value))}
                className="bg-accent/10 border-2 border-accent/30 focus-visible:border-accent/60 focus-visible:ring-accent/50 focus-visible:bg-accent/15 hover:border-accent/50 hover:bg-accent/15 px-3 py-2 text-sm font-semibold transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Cancellation Notice (hrs)</label>
              <Input
                type="number"
                min="0"
                max="168"
                step="1"
                value={String(getCurrentValue("cancellation_notice"))}
                onChange={(e) => handleChange("cancellation_notice", parseInt(e.target.value))}
                className="bg-accent/10 border-2 border-accent/30 focus-visible:border-accent/60 focus-visible:ring-accent/50 focus-visible:bg-accent/15 hover:border-accent/50 hover:bg-accent/15 px-3 py-2 text-sm font-semibold transition-colors"
              />
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3">How many hours must pass before a customer can cancel?</p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="border-2 border-secondary/40 bg-gradient-to-br from-secondary/5 to-secondary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-secondary" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-secondary/10 border-2 border-secondary/30 hover:border-secondary/50 hover:bg-secondary/15 rounded-lg cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={getCurrentValue("enable_reschedule") as boolean}
                onChange={(e) => handleChange("enable_reschedule", e.target.checked)}
                className="w-4 h-4 mt-1 flex-shrink-0 accent-secondary"
              />
              <div>
                <p className="text-sm font-medium">Customer Rescheduling</p>
                <p className="text-xs text-muted-foreground">Allow customers to reschedule</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-secondary/10 border-2 border-secondary/30 hover:border-secondary/50 hover:bg-secondary/15 rounded-lg cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={getCurrentValue("enable_auto_reminder") as boolean}
                onChange={(e) => handleChange("enable_auto_reminder", e.target.checked)}
                className="w-4 h-4 mt-1 flex-shrink-0 accent-secondary"
              />
              <div>
                <p className="text-sm font-medium">Auto Reminders</p>
                <p className="text-xs text-muted-foreground">Send reminder notifications</p>
              </div>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
              <p className="text-muted-foreground text-xs mb-1">Duration</p>
              <p className="font-bold text-foreground">{getCurrentValue("default_duration")}m</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
              <p className="text-muted-foreground text-xs mb-1">Buffer</p>
              <p className="font-bold text-foreground">{getCurrentValue("buffer_time")}m</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border-2 border-accent/30">
              <p className="text-muted-foreground text-xs mb-1">Work Hours</p>
              <p className="font-bold text-foreground">{getCurrentValue("working_hours_start")}-{getCurrentValue("working_hours_end")}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border-2 border-accent/30">
              <p className="text-muted-foreground text-xs mb-1">Lunch Break</p>
              <p className="font-bold text-foreground">{getCurrentValue("lunch_break_start")}-{getCurrentValue("lunch_break_end")}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border-2 border-secondary/30">
              <p className="text-muted-foreground text-xs mb-1">Max/Day</p>
              <p className="font-bold text-foreground">{getCurrentValue("max_daily_appointments")}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border-2 border-secondary/30">
              <p className="text-muted-foreground text-xs mb-1">Cancel Notice</p>
              <p className="font-bold text-foreground">{getCurrentValue("cancellation_notice")}h</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
