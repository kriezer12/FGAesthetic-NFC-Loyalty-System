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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectNative } from "@/components/ui/select-native"
import { Stock } from "@/hooks/use-inventory"
import { supabase } from "@/lib/supabase"

interface StockTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: Stock | null
  onTransfer: (params: {
    from_branch_id: string
    to_branch_id: string
    product_id: string
    quantity: number
    reason: string
  }) => Promise<void>
}

export function StockTransferModal({ open, onOpenChange, stock, onTransfer }: StockTransferModalProps) {
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [toBranchId, setToBranchId] = useState("")
  const [quantity, setQuantity] = useState<number | "">(1)
  const [reason, setReason] = useState("Stock rebalancing")
  const [error, setError] = useState("")

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await supabase
          .from("branches")
          .select("id, name")
          .order("name")
        
        // Filter out current branch
        const filtered = (data || []).filter(b => b.id !== stock?.branch_id)
        setBranches(filtered)
        
        // Auto-select first option
        if (filtered.length > 0 && !toBranchId) {
          setToBranchId(filtered[0].id)
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err)
      }
    }

    if (open) {
      fetchBranches()
    }
  }, [open, stock?.branch_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stock || !toBranchId || !quantity) {
      setError("Please fill in all fields")
      return
    }

    const numQuantity = Number(quantity) || 0
    if (numQuantity <= 0) {
      setError("Quantity must be greater than 0")
      return
    }

    if (numQuantity > stock.quantity) {
      setError(`Cannot transfer more than available stock (${stock.quantity} units)`)
      return
    }

    setError("")
    setLoading(true)

    try {
      await onTransfer({
        from_branch_id: stock.branch_id,
        to_branch_id: toBranchId,
        product_id: stock.product_id,
        quantity: numQuantity,
        reason: reason || "Stock transfer"
      })

      onOpenChange(false)
      setQuantity(1)
      setReason("Stock rebalancing")
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate transfer")
    } finally {
      setLoading(false)
    }
  }

  const maxQuantity = stock?.quantity || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
            <DialogDescription>
              Transfer <strong>{stock?.product?.name}</strong> to another branch.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* From Branch (Read-only) */}
            <div className="grid gap-2">
              <Label>From Branch</Label>
              <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                {stock?.branch?.name || "Current Branch"}
              </div>
            </div>

            {/* To Branch */}
            <div className="grid gap-2">
              <Label htmlFor="to_branch">To Branch</Label>
              {branches.length > 0 ? (
                <SelectNative
                  id="to_branch"
                  value={toBranchId}
                  onChange={(e) => setToBranchId(e.target.value)}
                >
                  <option value="">Select destination branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </SelectNative>
              ) : (
                <div className="text-sm text-muted-foreground">No other branches available</div>
              )}
            </div>

            {/* Quantity */}
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity to Transfer</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value
                  setQuantity(val === "" ? "" : parseInt(val) || 0)
                }}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Available: {maxQuantity} units
              </p>
            </div>

            {/* Reason */}
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Transfer</Label>
              <SelectNative
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="Stock rebalancing">Stock rebalancing</option>
                <option value="Demand adjustment">Demand adjustment</option>
                <option value="Overstocking">Overstocking</option>
                <option value="Low stock">Low stock at destination</option>
                <option value="Store opening">New store opening</option>
                <option value="Consolidation">Stock consolidation</option>
                <option value="Other">Other</option>
              </SelectNative>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !toBranchId || !quantity || branches.length === 0}
            >
              {loading ? "Initiating..." : "Initiate Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
