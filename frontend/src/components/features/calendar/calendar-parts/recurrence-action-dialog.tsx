/**
 * Recurrence Action Dialog
 * ========================
 *
 * Two-step dialog for recurring appointment actions:
 *   Step 1 — choose scope:
 *     1. "Only this appointment"
 *     2. "This and the next N" (N selectable via +/- counter)
 *     3. "This and all following"
 *     4. "All appointments in the series"
 *   Step 2 — confirmation warning before the destructive action fires.
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Repeat,
  CalendarX2,
  CalendarRange,
  CalendarDays,
  CalendarClock,
  Minus,
  Plus,
  TriangleAlert,
  ChevronLeft,
  Pencil,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecurrenceActionScope = "this" | "this-and-next-n" | "this-and-following" | "all"
export type RecurrenceActionType = "delete" | "edit"

interface RecurrenceActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType: RecurrenceActionType
  seriesCount: number
  /** Number of appointments from the selected one to the end (inclusive). */
  remainingCount: number
  onConfirm: (scope: RecurrenceActionScope, count?: number) => void
  /** Called when the user chooses "Edit instead" on the confirmation step. */
  onEditInstead?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scopeLabel(scope: RecurrenceActionScope, count: number, seriesCount: number): string {
  switch (scope) {
    case "this":               return "only this appointment"
    case "this-and-next-n":    return `this and the next ${count} appointment${count > 1 ? "s" : ""} (${count + 1} total)`
    case "this-and-following": return "this and all following appointments"
    case "all":                return `all ${seriesCount} appointments in the series`
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecurrenceActionDialog({
  open,
  onOpenChange,
  actionType,
  seriesCount,
  remainingCount,
  onConfirm,
  onEditInstead,
}: RecurrenceActionDialogProps) {
  const isDelete = actionType === "delete"

  // Step 1: scope selection  |  Step 2: confirmation
  const [step, setStep] = useState<1 | 2>(1)
  const [pendingScope, setPendingScope] = useState<RecurrenceActionScope | null>(null)
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined)

  // N-counter for "this-and-next-n"
  const maxNext = Math.max(1, remainingCount - 1)
  const [nextNCount, setNextNCount] = useState(1)

  // Reset to step 1 whenever the dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1)
      setPendingScope(null)
      setPendingCount(undefined)
      setNextNCount(1)
    }
  }, [open])

  function requestConfirm(scope: RecurrenceActionScope, count?: number) {
    if (isDelete) {
      // For delete — show confirmation step
      setPendingScope(scope)
      setPendingCount(count)
      setStep(2)
    } else {
      // For edit — confirm immediately (no destructive risk)
      onConfirm(scope, count)
    }
  }

  function handleConfirmed() {
    if (pendingScope) onConfirm(pendingScope, pendingCount)
  }

  // ---- Step 1: scope picker ------------------------------------------------

  const scopePicker = (
    <div key="step-1" className="animate-in fade-in duration-200">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          {isDelete ? "Delete recurring appointment" : "Edit recurring appointment"}
        </DialogTitle>
        <DialogDescription>
          This appointment is part of a series of{" "}
          <span className="font-medium text-foreground">{seriesCount}</span> appointments.
          What would you like to {isDelete ? "delete" : "edit"}?
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 py-2">
        {/* 1. Only this */}
        <button
          onClick={() => requestConfirm("this")}
          className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarX2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Only this appointment</p>
            <p className="text-xs text-muted-foreground">
              {isDelete ? "Remove just this one occurrence" : "Change only this one occurrence"}
            </p>
          </div>
        </button>

        {/* 2. This and the next N */}
        {remainingCount > 1 && (
          <div className="rounded-lg border bg-card px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  This and the next{" "}
                  <span className="tabular-nums font-semibold">{nextNCount}</span>{" "}
                  appointment{nextNCount > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextNCount + 1} occurrence{nextNCount + 1 > 1 ? "s" : ""} affected
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setNextNCount((n) => Math.max(1, n - 1))}
                  disabled={nextNCount <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">
                  {nextNCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setNextNCount((n) => Math.min(maxNext, n + 1))}
                  disabled={nextNCount >= maxNext}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Separator />
            <Button
              variant={isDelete ? "destructive" : "default"}
              size="sm"
              className="w-full"
              onClick={() => requestConfirm("this-and-next-n", nextNCount)}
            >
              {isDelete
                ? `Delete these ${nextNCount + 1} appointments`
                : `Apply to these ${nextNCount + 1} appointments`}
            </Button>
          </div>
        )}

        {/* 3. This and all following */}
        <button
          onClick={() => requestConfirm("this-and-following")}
          className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">This and all following</p>
            <p className="text-xs text-muted-foreground">
              {isDelete
                ? "Remove this and all later appointments in the series"
                : "Change this and all later appointments in the series"}
            </p>
          </div>
        </button>

        {/* 4. All in series */}
        <button
          onClick={() => requestConfirm("all")}
          className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">All {seriesCount} appointments in the series</p>
            <p className="text-xs text-muted-foreground">
              {isDelete
                ? "Remove every appointment in this recurring series"
                : "Change every appointment in this recurring series"}
            </p>
          </div>
        </button>
      </div>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </div>
  )

  // ---- Step 2: confirmation ------------------------------------------------

  const confirmation = pendingScope && (
    <div key="step-2" className="animate-in fade-in duration-200 flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base text-destructive">
          <TriangleAlert className="h-4 w-4" />
          Confirm deletion
        </DialogTitle>
        <DialogDescription>
          You are about to permanently delete{" "}
          <span className="font-medium text-foreground">
            {scopeLabel(pendingScope, pendingCount ?? nextNCount, seriesCount)}
          </span>
          . This action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Deleted appointments are removed permanently and cannot be recovered.
      </div>

      <div className="mt-1" />

      {onEditInstead && (
        <button
          onClick={() => { onOpenChange(false); onEditInstead() }}
          className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full"
        >
          <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Edit instead</p>
            <p className="text-xs text-muted-foreground">Go back and make changes to this appointment</p>
          </div>
        </button>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setStep(1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={handleConfirmed}>
          Yes, delete
        </Button>
      </DialogFooter>
    </div>
  )

  // ---- Render --------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 1 ? scopePicker : confirmation}
      </DialogContent>
    </Dialog>
  )
}
