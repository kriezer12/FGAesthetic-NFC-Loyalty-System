import { Button } from "@/components/ui/button"
import type { CartItem } from "./types"

interface PosCartProps {
  cartItems: CartItem[]
  onRemoveItem: (id: string) => void
  formatMoney: (value: number) => string
}

export function PosCart({ cartItems, onRemoveItem, formatMoney }: PosCartProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Unit</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                Cart is empty.
              </td>
            </tr>
          ) : (
            cartItems.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{formatMoney(item.unit_price)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(item.line_total)}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
