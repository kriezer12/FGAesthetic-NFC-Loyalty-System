import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { Treatment } from "@/types/customer"
import { validateTreatments } from "@/lib/treatment-utils"

interface TreatmentStatusManagerProps {
  treatments: Treatment[]
  isUpdating?: boolean
  onSave: (updated: Treatment[]) => void
}

export function TreatmentStatusManager({
  treatments,
  isUpdating = false,
  onSave,
}: TreatmentStatusManagerProps) {
  const [local, setLocal] = React.useState<Treatment[]>(() =>
    treatments.map((t) => ({ ...t })),
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    // if parent updates the treatments prop, reset local copy
    setLocal(treatments.map((t) => ({ ...t })))
  }, [treatments])

  const validate = React.useCallback(() => {
    const { valid, errors: errs } = validateTreatments(local)
    setErrors(errs)
    return valid
  }, [local])

  const handleRemainingChange = (id: string, value: number | "") => {
    setLocal((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const numValue = value === "" ? 0 : value
        const remaining = Math.max(0, Math.min(numValue, t.total_sessions))
        return {
          ...t,
          remaining_sessions: value === "" ? "" : remaining,
          used_sessions: t.total_sessions - remaining,
        } as any
      }),
    )
  }

  const handleSave = () => {
    if (!validate()) return
    onSave(local)
  }

  const activeTreatments = local.filter(t => t.remaining_sessions > 0)
  const completedTreatments = local.filter(t => t.remaining_sessions <= 0)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Active Treatments</h3>
        {activeTreatments.length === 0 && <p className="text-sm text-muted-foreground">No active treatments</p>}
        {activeTreatments.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card">
            <span className="font-medium text-sm flex-1">{t.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Remaining:</span>
              <Input
                type="number"
                value={t.remaining_sessions ?? ""}
                min={0}
                max={t.total_sessions}
                className="w-20 h-8"
                onChange={(e) => {
                  const val = e.target.value;
                  handleRemainingChange(t.id, val === "" ? "" : (parseInt(val, 10) || 0))
                }}
                disabled={isUpdating}
              />
              <span className="text-xs text-muted-foreground w-8">/ {t.total_sessions}</span>
            </div>
            {errors[t.id] && (
              <span className="text-red-500 text-xs w-full block mt-1">{errors[t.id]}</span>
            )}
          </div>
        ))}
      </div>

      {completedTreatments.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-lg font-semibold text-muted-foreground">Completed Treatments</h3>
          {completedTreatments.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/40 opacity-70">
              <span className="font-medium text-sm flex-1 line-through">{t.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Remaining:</span>
                <Input
                  type="number"
                  value={t.remaining_sessions ?? ""}
                  min={0}
                  max={t.total_sessions}
                  className="w-20 h-8 bg-transparent"
                  onChange={(e) => {
                    const val = e.target.value;
                    handleRemainingChange(t.id, val === "" ? "" : (parseInt(val, 10) || 0))
                  }}
                  disabled={isUpdating}
                />
                <span className="text-xs text-muted-foreground w-8">/ {t.total_sessions}</span>
              </div>
              {errors[t.id] && (
                <span className="text-red-500 text-xs w-full block mt-1">{errors[t.id]}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {local.length > 0 && (
        <Button
          disabled={isUpdating || Object.keys(errors).length > 0}
          onClick={handleSave}
          className="w-full mt-4"
        >
          Save treatments
        </Button>
      )}
    </div>
  )
}
