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
  const [quantity, setQuantity] = useState(0)
  const [reason, setReason] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stock) return
    setLoading(true)
    try {
      let actualQuantity = 0
      
      if (adjustmentType === 'adjustment') {
        // Manual Adjustment: quantity is the target final value
        // We calculate the delta to store in the transaction
        actualQuantity = quantity - stock.quantity
      } else {
        // Restock/Usage: quantity is the delta
        actualQuantity = adjustmentType === 'out' ? -Math.abs(quantity) : Math.abs(quantity)
      }
      
      await onAdjust({
        productId: stock.product_id,
        branchId: stock.branch_id,
        quantity: actualQuantity,
        type: adjustmentType,
        reason: reason
      })
      onOpenChange(false)
      setQuantity(0)
      setReason("")
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
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Current quantity: {stock?.quantity}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason / Notes</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Weekly restock, Damaged, New shipment"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (adjustmentType !== 'adjustment' && quantity <= 0)}>
              {loading ? "Applying..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
