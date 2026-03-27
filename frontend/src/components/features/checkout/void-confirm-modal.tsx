import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LogTx } from "./types"

interface VoidConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voidTarget: LogTx | null
  voidReason: string
  onVoidReasonChange: (reason: string) => void
  onConfirm: () => void
}

export function VoidConfirmModal({
  open,
  onOpenChange,
  voidTarget,
  voidReason,
  onVoidReasonChange,
  onConfirm,
}: VoidConfirmModalProps) {
  if (!voidTarget) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Transaction: {voidTarget.receipt_number}</DialogTitle>
          <DialogDescription className="space-y-4 pt-2 block">
             <span className="block font-medium text-destructive">
               Warning: Voiding this transaction will mark it as invalid and will restock any associated inventory products. This action cannot be reversed.
             </span>
             <span className="block space-y-2">
               <span className="block text-sm font-semibold text-foreground">Reason for voiding:</span>
               <Input 
                  value={voidReason} 
                  onChange={(e) => onVoidReasonChange(e.target.value)}
                  placeholder="e.g. Test, Wrong Input, Customer Refund..." 
                  autoFocus
               />
             </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
             Confirm Void
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
