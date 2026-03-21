import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectNative } from "@/components/ui/select-native"
import { Stock } from "@/hooks/use-inventory"

interface StockAdjustmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: Stock | null
  onAdjust: (params: {
    productId: string
    branchId: string
    quantity: number
    type: 'in' | 'out' | 'adjustment'
    reason: string
  }) => Promise<void>
}

export function StockAdjustmentModal({ open, onOpenChange, stock, onAdjust }: StockAdjustmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out' | 'adjustment'>('adjustment')
  const [quantity, setQuantity] = useState<number | "">(0)
  const [reasonCategory, setReasonCategory] = useState("Manual Audit")
  const [notes, setNotes] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stock) return
    const numQuantity = Number(quantity) || 0
    setLoading(true)
    try {
      let actualQuantity = 0
      
      if (adjustmentType === 'adjustment') {
        // Manual Adjustment: quantity is the target final value
        // We calculate the delta to store in the transaction
        actualQuantity = numQuantity - stock.quantity
      } else {
        // Restock/Usage: quantity is the delta
        actualQuantity = adjustmentType === 'out' ? -Math.abs(numQuantity) : Math.abs(numQuantity)
      }
      
      await onAdjust({
        productId: stock.product_id,
        branchId: stock.branch_id,
        quantity: actualQuantity,
        type: adjustmentType,
        reason: notes ? `[${reasonCategory}] ${notes}` : reasonCategory
      })
      onOpenChange(false)
      setQuantity(0)
      setReasonCategory("Manual Audit")
      setNotes("")
    } catch (error) {
      console.error("Failed to adjust stock:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Modify stock levels for <strong>{stock?.product?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Adjustment Type</Label>
              <SelectNative 
                id="type"
                value={adjustmentType} 
                onChange={(e) => {
                  const newType = e.target.value as any
                  setAdjustmentType(newType)
                  // Reset quantity to current if manual, or 0 if delta
                  setQuantity(newType === 'adjustment' ? stock?.quantity || 0 : 0)
                }}
              >
                <option value="in">Restock (In)</option>
                <option value="out">Usage (Out)</option>
                <option value="adjustment">Manual Adjustment</option>
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">
                {adjustmentType === 'adjustment' ? 'Final Quantity' : 'Quantity Change'}
              </Label>
              <Input
                id="quantity"
                type="number"
                min={adjustmentType === 'adjustment' ? "0" : "1"}
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuantity(val === "" ? "" : parseInt(val) || 0);
                }}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Current quantity: {stock?.quantity}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reasonCategory">Reason Category</Label>
              <SelectNative
                id="reasonCategory"
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
              >
                <option value="Manual Audit">Manual Audit / Correction</option>
                <option value="New Delivery">New Delivery / Restock</option>
                <option value="Damaged Goods">Damaged Goods</option>
                <option value="Expired">Expired Items</option>
                <option value="Internal Use">Internal consumption</option>
                <option value="Customer Return">Customer Return</option>
                <option value="Other">Other</option>
              </SelectNative>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details of the adjustment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (adjustmentType !== 'adjustment' && Number(quantity) <= 0)}>
              {loading ? "Applying..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
