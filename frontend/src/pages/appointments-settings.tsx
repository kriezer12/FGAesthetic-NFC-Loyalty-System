import { useEffect, useState, useCallback } from "react"
import { Calendar, Settings2, Clock, Zap, Building2, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useBranches } from "@/hooks/use-branches"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TimePicker12Hour } from "@/components/ui/time-picker-12h"
import { NotificationToast } from "@/components/ui/notification-toast"
import { fetchAppointmentSettings, saveAppointmentSettings, type AppointmentSettings } from "@/services/appointment-settings"

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

export default function AppointmentsSettingsPage() {
  const { userProfile } = useAuth()
  const isSuperAdmin = userProfile?.role === "super_admin"
  const { branches } = useBranches()
  const [selectedBranchId, setSelectedBranchId] = useState<string>(userProfile?.branch_id || "")

  const [settings, setSettings] = useState<AppointmentSettings>(defaultSettings)
  const [changes, setChanges] = useState<Partial<AppointmentSettings>>({})
  const [toast, setToast] = useState<{ id: string; title: string; message: string; type: "warning" | "success" } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    document.title = "Appointment Settings - FG Aesthetic Centre"
  }, [])

  // Load settings from database on mount or when branch changes
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const loadedSettings = await fetchAppointmentSettings(selectedBranchId)
      setSettings(loadedSettings)
      setChanges({}) // Clear changes when switching branches
    } catch (error) {
      console.error("Error loading settings:", error)
      setToast({
        id: crypto.randomUUID(),
        title: "Load Error",
        message: "Could not load settings for this branch.",
        type: "warning",
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedBranchId])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleChange = (key: keyof AppointmentSettings, value: any) => {
    setChanges((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const getCurrentValue = (key: keyof AppointmentSettings) => {
    return changes.hasOwnProperty(key) ? changes[key] : settings[key]
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

    const newSettings = { ...settings, ...changes, branch_id: selectedBranchId }
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
    saveAppointmentSettings({ ...defaultSettings, branch_id: selectedBranchId }).then(() => {
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Appointment Settings</h1>
          
          {isSuperAdmin && branches && branches.length > 0 && (
            <div className="ml-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 border-primary/30 bg-primary/5 min-w-[200px]">
                    <Building2 className="mr-2 h-4 w-4 text-primary" />
                    <span>
                      {branches.find(b => b.id === selectedBranchId)?.name || "Select Branch"}
                    </span>
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuRadioGroup value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    {branches.map((branch) => (
                      <DropdownMenuRadioItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
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
