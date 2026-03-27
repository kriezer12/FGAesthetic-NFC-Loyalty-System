import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PosInventoryItem } from "./types"

interface PosInventoryViewProps {
  inventorySearch: string
  onInventorySearchChange: (value: string) => void
  onRefresh: () => void
  inventoryLoading: boolean
  inventoryError: string | null
  filteredInventoryRows: PosInventoryItem[]
  formatMoney: (value: number) => string
}

export function PosInventoryView({
  inventorySearch,
  onInventorySearchChange,
  onRefresh,
  inventoryLoading,
  inventoryError,
  filteredInventoryRows,
  formatMoney,
}: PosInventoryViewProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">POS Inventory</h2>
          <p className="text-sm text-muted-foreground">Live stock visibility for selling decisions in checkout.</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={inventorySearch}
            onChange={(e) => onInventorySearchChange(e.target.value)}
            placeholder="Search product or SKU"
            className="w-64"
          />
          <Button type="button" variant="outline" onClick={onRefresh} disabled={inventoryLoading}>
            {inventoryLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {inventoryError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {inventoryError}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="px-3 py-2 text-right">Stock</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventoryLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading inventory...</td>
              </tr>
            ) : filteredInventoryRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No inventory items found.</td>
              </tr>
            ) : (
              filteredInventoryRows.map((row) => {
                const qty = row.stock_qty;
                let statusNode = null;
                
                if (!row.is_active) {
                  statusNode = <span className="rounded-md bg-muted px-2 py-1 text-xs whitespace-nowrap">Inactive</span>
                } else if (qty <= 0) {
                  statusNode = <span className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-900 font-semibold whitespace-nowrap">No Stock</span>
                } else if (row.danger_level > 0 && qty <= row.danger_level) {
                  statusNode = <span className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-900 font-semibold whitespace-nowrap">Danger</span>
                } else if (row.min_stock_level > 0 && qty <= row.min_stock_level) {
                  statusNode = <span className="rounded-md bg-orange-100 px-2 py-1 text-xs text-orange-900 font-semibold whitespace-nowrap">Warning</span>
                } else if (row.reorder_level > 0 && qty <= row.reorder_level) {
                  statusNode = <span className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900 font-semibold whitespace-nowrap">Reorder</span>
                } else {
                  statusNode = <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-900 font-medium whitespace-nowrap">Healthy</span>
                }

                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.sku || "-"}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(row.unit_price)}</td>
                    <td className="px-3 py-2 text-right font-bold">{qty}</td>
                    <td className="px-3 py-2">{statusNode}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
