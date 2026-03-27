import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PosControlsProps {
  appointmentOptions: { value: string; label: string; description?: string }[]
  selectedAppointmentId: string
  onAppointmentChange: (id: string) => void
  customerOptions: { value: string; label: string }[]
  selectedCustomerId: string
  onCustomerChange: (id: string) => void
  productOptions: { value: string; label: string }[]
  selectedProductId: string
  onProductChange: (id: string) => void
  productQty: string
  onProductQtyChange: (qty: string) => void
  onAddProduct: () => void
}

export function PosControls({
  appointmentOptions,
  selectedAppointmentId,
  onAppointmentChange,
  customerOptions,
  selectedCustomerId,
  onCustomerChange,
  productOptions,
  selectedProductId,
  onProductChange,
  productQty,
  onProductQtyChange,
  onAddProduct,
}: PosControlsProps) {
  return (
    <Card className="rounded-none border-0 border-r shadow-none">
      <CardHeader>
        <CardTitle>Cart Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">Load from Appointment</p>
          <Combobox
            options={appointmentOptions}
            value={selectedAppointmentId}
            onValueChange={onAppointmentChange}
            placeholder="Select appointment"
            emptyMessage="No unbilled appointments found"
          />
          <p className="text-xs text-muted-foreground">
            Recurring/package schedules are billed once. Follow-up occurrences in the same package are excluded after billing.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Customer <span>(Retail-only)</span></p>
          <Combobox
            options={customerOptions}
            value={selectedCustomerId}
            onValueChange={onCustomerChange}
            placeholder="Walk-in checkout or select profile"
            emptyMessage="No customers found"
          />
          <p className="text-xs text-muted-foreground">
            Automatically selected if loading from an appointment. Use for pure retail walk-in checkouts.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Add Retail Product</p>
          <div className="grid gap-2 md:grid-cols-[1fr_120px_140px]">
            <Combobox
              options={productOptions}
              value={selectedProductId}
              onValueChange={onProductChange}
              placeholder="Select product"
              emptyMessage="No products found"
            />
            <Input
              type="number"
              min={1}
              value={productQty}
              onChange={(e) => onProductQtyChange(e.target.value)}
              placeholder="Qty"
            />
            <Button type="button" variant="outline" onClick={onAddProduct}>
              Add Product
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
