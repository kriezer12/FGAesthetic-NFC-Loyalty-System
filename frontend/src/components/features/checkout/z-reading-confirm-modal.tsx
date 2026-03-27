import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ZReadingConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zBusinessDate: string
  onXReading: () => void
  onZReading: () => void
}

export function ZReadingConfirmModal({
  open,
  onOpenChange,
  zBusinessDate,
  onXReading,
  onZReading,
}: ZReadingConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Final Z-Reading Report?</DialogTitle>
          <DialogDescription className="space-y-3 block">
            <span className="block">
              <strong>Business Date:</strong> {zBusinessDate}
            </span>
            <span className="block">
              This action signifies the end of the operational business day. 
              Final Z-Reading reports finalize sales records for the day and can only be executed once.
            </span>
            <span className="block font-semibold text-destructive">
              Are you sure you want to end the operational day?
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="secondary" onClick={() => { onOpenChange(false); onXReading() }}>X-Reading (Preview)</Button>
          <Button type="button" onClick={onZReading}>Finalize Day & Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
