import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { NFCScanner } from "@/components/features/nfc"
import type { Customer } from "@/types/customer"

interface AssignNfcModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCustomer: Customer | null
  scanMessage: string | null
  setScanMessage: (msg: string | null) => void
  isAssigningNfc: boolean
  setIsAssigningNfc: (val: boolean) => void
  reassignPrompt: { nfcUid: string; ownerName: string; ownerId: string } | null
  setReassignPrompt: (prompt: { nfcUid: string; ownerName: string; ownerId: string } | null) => void
  handleAssignNfcCard: (nfcUid: string) => Promise<void>
  handleConfirmReassign: () => Promise<void>
  handleCancelReassign: () => void
  shouldReopenProfileEditor: boolean
  setProfileEditorOpen: (open: boolean) => void
  setShouldReopenProfileEditor: (open: boolean) => void
}

export function AssignNfcModal({
  open,
  onOpenChange,
  selectedCustomer,
  scanMessage,
  setScanMessage,
  isAssigningNfc,
  setIsAssigningNfc,
  assignSuccessMessage,
  reassignPrompt,
  setReassignPrompt,
  handleAssignNfcCard,
  handleConfirmReassign,
  handleCancelReassign,
  shouldReopenProfileEditor,
  setProfileEditorOpen,
  setShouldReopenProfileEditor,
}: AssignNfcModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Tag New NFC Card</DialogTitle>
              <DialogDescription>
                Scan a new NFC card to assign it to this customer.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                setReassignPrompt(null)
                setIsAssigningNfc(false)
                if (shouldReopenProfileEditor) {
                  setProfileEditorOpen(true)
                  setShouldReopenProfileEditor(false)
                }
              }}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-6">
          {scanMessage && (
            <div className="sticky top-0 z-10 w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-4">
              <p className="font-medium text-destructive">Card already assigned</p>
              <p className="text-sm text-destructive/80 mt-2">{scanMessage}</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setScanMessage(null)}
                  disabled={isAssigningNfc}
                >
                  Scan another card
                </Button>
              </div>
            </div>
          )}
          {assignSuccessMessage && (
            <div className="sticky top-0 z-10 w-full max-w-md rounded-lg border border-emerald-200 bg-emerald-50 p-4 mb-4">
              <p className="font-medium text-emerald-700">Card assigned</p>
              <p className="text-sm text-emerald-700 mt-2">{assignSuccessMessage}</p>
            </div>
          )}

          <div className="w-full max-w-md">
            <NFCScanner
              onCustomerFound={(cardCustomer) => {
                if (!selectedCustomer) return
                handleAssignNfcCard(cardCustomer.nfc_uid)
              }}
              onNewCard={(uid) => handleAssignNfcCard(uid)}
            />
          </div>

          {isAssigningNfc && (
            <p className="mt-4 text-sm text-muted-foreground">Assigning card…</p>
          )}
          {reassignPrompt && (
            <div className="sticky top-0 z-10 w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4 mt-4">
              <p className="font-medium text-destructive">Card already assigned</p>
              <p className="text-sm text-destructive/80 mt-2">
                This card is currently assigned to <span className="font-semibold">{reassignPrompt.ownerName}</span>.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelReassign}
                  disabled={isAssigningNfc}
                >
                  Scan another card
                </Button>
                <Button
                  onClick={handleConfirmReassign}
                  disabled={isAssigningNfc}
                >
                  Reassign to this customer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
