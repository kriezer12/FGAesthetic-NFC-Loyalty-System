import { useEffect, useMemo, useState } from "react"
import { Box, Clock3, Settings2, ShoppingCart, ShieldAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationToast } from "@/components/ui/notification-toast"
import { useAuth } from "@/contexts/auth-context"

type AdjustmentOption = {
  id: string
  name: string
  percent: number
  enabled?: boolean
  isSystem?: boolean
}

const defaultAdjustments: AdjustmentOption[] = [
  { id: "senior", name: "Senior Citizen", percent: 20, enabled: true, isSystem: true },
  { id: "pwd", name: "PWD", percent: 20, enabled: true, isSystem: true },
  { id: "employee", name: "Employee", percent: 10, enabled: true, isSystem: true },
  { id: "vip", name: "VIP", percent: 15, enabled: true, isSystem: true },
]

const localAdjustmentStorageKey = "fg_pos_adjustments"

export default function PosSettingsPage() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [percent, setPercent] = useState("")
  const [adjustments, setAdjustments] = useState<AdjustmentOption[]>(defaultAdjustments)
  const [toast, setToast] = useState<{ id: string; title: string; message: string; type: "warning" | "success" } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(localAdjustmentStorageKey)
      if (!raw) {
        setAdjustments(defaultAdjustments)
        return
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter((p) => typeof p?.id === "string" && typeof p?.name === "string" && Number.isFinite(Number(p?.percent)))
          .map((p) => ({ ...p, enabled: p?.enabled !== false }))
        setAdjustments(cleaned)
      }
    } catch {
      setAdjustments(defaultAdjustments)
    }
  }, [])

  const sortedAdjustments = useMemo(
    () => [...adjustments].sort((a, b) => a.name.localeCompare(b.name)),
    [adjustments],
  )

  const persist = (next: AdjustmentOption[]) => {
    setAdjustments(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(localAdjustmentStorageKey, JSON.stringify(next))
    }
  }

  const addAdjustment = () => {
    const trimmedName = name.trim()
    const value = Number(percent)

    if (!trimmedName) {
      setToast({ id: crypto.randomUUID(), title: "POS Warning", message: "Adjustment name is required.", type: "warning" })
      return
    }
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      setToast({ id: crypto.randomUUID(), title: "POS Warning", message: "Percent must be between 0.01 and 100.", type: "warning" })
      return
    }

    const next = [
      ...adjustments,
      { id: crypto.randomUUID(), name: trimmedName, percent: value, enabled: true },
    ]
    persist(next)
    setName("")
    setPercent("")
    setToast({ id: crypto.randomUUID(), title: "POS Confirmation", message: "Adjustment saved.", type: "success" })
  }

  const updatePercent = (id: string, nextPercent: string) => {
    const value = Number(nextPercent)
    if (!Number.isFinite(value) || value <= 0 || value > 100) return

    const next = adjustments.map((adjustment) =>
      adjustment.id === id ? { ...adjustment, percent: value } : adjustment,
    )
    persist(next)
    setToast({ id: crypto.randomUUID(), title: "POS Confirmation", message: "Adjustment updated.", type: "success" })
  }

  const updateName = (id: string, nextName: string) => {
    const trimmed = nextName.trim()
    if (!trimmed) return

    const next = adjustments.map((adjustment) =>
      adjustment.id === id ? { ...adjustment, name: trimmed } : adjustment,
    )
    persist(next)
    setToast({ id: crypto.randomUUID(), title: "POS Confirmation", message: "Adjustment updated.", type: "success" })
  }

  const toggleEnabled = (id: string, enabled: boolean) => {
    const next = adjustments.map((adjustment) =>
      adjustment.id === id ? { ...adjustment, enabled } : adjustment,
    )
    persist(next)
    setToast({
      id: crypto.randomUUID(),
      title: "POS Confirmation",
      message: enabled ? "Adjustment enabled for checkout." : "Adjustment hidden from checkout.",
      type: "success",
    })
  }

  const removeAdjustment = (id: string) => {
    const next = adjustments.filter((adjustment) => adjustment.id !== id)
    persist(next.length > 0 ? next : defaultAdjustments)
    setToast({ id: crypto.randomUUID(), title: "POS Confirmation", message: "Adjustment removed.", type: "success" })
  }

  const resetDefaults = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Reset all adjustments to defaults? This will overwrite your current setup.")
      if (!confirmed) return
    }
    persist(defaultAdjustments)
    setToast({ id: crypto.randomUUID(), title: "POS Confirmation", message: "Reset to default adjustments.", type: "success" })
  }

  if (userProfile?.role === "staff") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-center">
          You do not have permission to access POS Settings.
        </p>
        <Button onClick={() => navigate("/dashboard/checkout")}>
          Return to POS
        </Button>
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

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">POS Settings</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/dashboard/checkout?view=inventory")}> 
              <Box className="mr-2 h-4 w-4" />
              Inventory
            </Button>
            {userProfile?.role !== "staff" && (
              <>
                <Button type="button" variant="default" size="sm" onClick={() => navigate("/dashboard/pos-settings")}> 
                  <Settings2 className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => navigate("/dashboard/checkout?view=logs")}> 
                  <Clock3 className="mr-2 h-4 w-4" />
                  Logs
                </Button>
              </>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/dashboard/checkout")}> 
              <ShoppingCart className="mr-2 h-4 w-4" />
              POS
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Configure all checkout adjustments (discounts/promos merged as one list).</p>

          <Card>
            <CardHeader>
              <CardTitle>Add Adjustment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-[1fr_180px_140px]">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Holiday Promo, Senior)" />
              <Input type="number" min={0.01} max={100} step="0.01" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Percent" />
              <Button type="button" onClick={addAdjustment}>Save</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configured Adjustments</CardTitle>
              <Button type="button" variant="outline" onClick={resetDefaults}>Reset Defaults</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedAdjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No adjustments configured.</p>
              ) : (
                sortedAdjustments.map((adjustment) => (
                  <div key={adjustment.id} className="grid items-center gap-2 rounded-md border p-2 md:grid-cols-[1fr_160px_180px_120px]">
                    <div>
                      <Input
                        defaultValue={adjustment.name}
                        onBlur={(e) => updateName(adjustment.id, e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Shown as an adjustment option in checkout when enabled.</p>
                    </div>
                    <Input
                      type="number"
                      min={0.01}
                      max={100}
                      step="0.01"
                      defaultValue={adjustment.percent}
                      onBlur={(e) => updatePercent(adjustment.id, e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={adjustment.enabled !== false}
                        onChange={(e) => toggleEnabled(adjustment.id, e.target.checked)}
                      />
                      Show on checkout
                    </label>
                    <Button type="button" variant="outline" onClick={() => removeAdjustment(adjustment.id)}>
                      Delete
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
