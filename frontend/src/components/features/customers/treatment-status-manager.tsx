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

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Treatment progress</h3>
      {local.length === 0 && <p className="text-sm text-muted-foreground">No treatments assigned</p>}
      {local.map((t) => (
        <div key={t.id} className="flex items-center gap-2">
          <span className="flex-1">{t.name}</span>
          <Input
            type="number"
            value={t.remaining_sessions ?? ""}
            min={0}
            max={t.total_sessions}
            className="w-20"
            onChange={(e) => {
              const val = e.target.value;
              handleRemainingChange(t.id, val === "" ? "" : (parseInt(val, 10) || 0))
            }}
            disabled={isUpdating}
          />
          <span className="text-xs text-muted-foreground">/ {t.total_sessions}</span>
          {errors[t.id] && (
            <span className="text-red-500 text-xs">{errors[t.id]}</span>
          )}
        </div>
      ))}

      <Button
        disabled={isUpdating || local.length === 0 || Object.keys(errors).length > 0}
        onClick={handleSave}
      >
        Save treatments
      </Button>
    </div>
  )
}
