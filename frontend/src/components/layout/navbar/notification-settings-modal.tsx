import { useState, useEffect } from "react"
import { Bell, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  useNotificationSettings,
  AVAILABLE_INTERVALS,
  type NotificationSettings,
} from "@/contexts/notification-settings-context"

interface NotificationSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationSettingsModal({ open, onOpenChange }: NotificationSettingsModalProps) {
  const { settings, updateSettings } = useNotificationSettings()

  const [draft, setDraft] = useState<NotificationSettings>(settings)
  const [saved, setSaved] = useState(false)

  // Sync draft whenever modal opens
  useEffect(() => {
    if (open) {
      setDraft(settings)
      setSaved(false)
    }
  }, [open, settings])

  const handleToggle = (alert: "firstAlert" | "secondAlert") => {
    setDraft((prev) => ({
      ...prev,
      [alert]: { ...prev[alert], enabled: !prev[alert].enabled },
    }))
    setSaved(false)
  }

  const handleMinutesChange = (alert: "firstAlert" | "secondAlert", minutes: number) => {
    setDraft((prev) => ({
      ...prev,
      [alert]: { ...prev[alert], minutes },
    }))
    setSaved(false)
  }

  const isValid =
    !draft.firstAlert.enabled ||
    !draft.secondAlert.enabled ||
    draft.firstAlert.minutes > draft.secondAlert.minutes

  const handleSave = () => {
    if (!isValid) return
    updateSettings(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayBlur="subtle" className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Settings
          </DialogTitle>
          <DialogDescription>
            Choose when to be alerted before upcoming appointments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-2">
          {/* First Alert */}
          <AlertRow
            label="First Alert"
            description="Advance notice before appointment"
            enabled={draft.firstAlert.enabled}
            minutes={draft.firstAlert.minutes}
            onToggle={() => handleToggle("firstAlert")}
            onMinutesChange={(m) => handleMinutesChange("firstAlert", m)}
          />

          {/* Second Alert */}
          <AlertRow
            label="Second Alert"
            description="Final reminder before appointment"
            enabled={draft.secondAlert.enabled}
            minutes={draft.secondAlert.minutes}
            onToggle={() => handleToggle("secondAlert")}
            onMinutesChange={(m) => handleMinutesChange("secondAlert", m)}
          />

          {/* Validation message */}
          {!isValid && (
            <p className="text-xs text-destructive">
              First alert must be greater than second alert.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in slide-in-from-right-2">
                <CheckCircle className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            <Button size="sm" onClick={handleSave} disabled={!isValid}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Alert Row ─────────────────────────────────────────── */

function AlertRow({
  label,
  description,
  enabled,
  minutes,
  onToggle,
  onMinutesChange,
}: {
  label: string
  description: string
  enabled: boolean
  minutes: number
  onToggle: () => void
  onMinutesChange: (m: number) => void
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        enabled
          ? "border-border bg-card"
          : "border-muted bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={`relative flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={minutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {AVAILABLE_INTERVALS.map((m) => (
              <option key={m} value={m}>
                {m} minutes before
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
