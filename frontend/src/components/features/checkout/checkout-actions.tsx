import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { Download } from "lucide-react"
import type { AdjustmentOption, CreatedTransaction } from "./types"

interface CheckoutActionsProps {
  isCheckoutStage: boolean
  setIsCheckoutStage: (stage: boolean) => void
  visibleAdjustments: AdjustmentOption[]
  selectedAdjustment: AdjustmentOption | null
  onApplyAdjustment: (option: AdjustmentOption | null) => void
  onNavigateSettings: () => void
  onProceedToCheckout: () => void
  paymentMethodOptions: { value: string; label: string }[]
  paymentMethod: string
  onPaymentMethodChange: (method: string) => void
  requiresPaymentReference: boolean
  supportsOptionalReference: boolean
  referenceLabel: string
  paymentReference: string
  onPaymentReferenceChange: (ref: string) => void
  amountPaidInput: string
  onAppendCashDigit: (token: string) => void
  onApplyQuickCash: (amount: number) => void
  paymentMethodLabel: string
  subtotal: number
  discount: number
  totalDue: number
  paid: number
  change: number
  formatMoney: (value: number) => string
  isLoading: boolean
  onCompleteSale: () => void
  lastTransaction: CreatedTransaction | null
  onPrintInvoice: () => void
}

export function CheckoutActions({
  isCheckoutStage,
  setIsCheckoutStage,
  visibleAdjustments,
  selectedAdjustment,
  onApplyAdjustment,
  onNavigateSettings,
  onProceedToCheckout,
  paymentMethodOptions,
  paymentMethod,
  onPaymentMethodChange,
  requiresPaymentReference,
  supportsOptionalReference,
  referenceLabel,
  paymentReference,
  onPaymentReferenceChange,
  amountPaidInput,
  onAppendCashDigit,
  onApplyQuickCash,
  paymentMethodLabel,
  subtotal,
  discount,
  totalDue,
  paid,
  change,
  formatMoney,
  isLoading,
  onCompleteSale,
  lastTransaction,
  onPrintInvoice,
}: CheckoutActionsProps) {
  return (
    <div className="flex min-h-[700px] flex-col gap-4 p-6">
      {!isCheckoutStage && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Adjustments (Discounts / Promos)</p>
              <Button type="button" variant="ghost" size="sm" onClick={onNavigateSettings}>
                Configure in Settings
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={!selectedAdjustment ? "default" : "outline"}
                onClick={() => onApplyAdjustment(null)}
              >
                No Adjustment
              </Button>
              {visibleAdjustments.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant={selectedAdjustment?.id === option.id ? "default" : "outline"}
                  onClick={() => onApplyAdjustment(option)}
                >
                  {option.name} ({option.percent}%)
                </Button>
              ))}
            </div>
          </div>

          <Button type="button" className="w-full" onClick={onProceedToCheckout}>
            Checkout
          </Button>
        </>
      )}

      {isCheckoutStage && (
        <>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Payment Method</p>
            <Combobox
              options={paymentMethodOptions}
              value={paymentMethod}
              onValueChange={onPaymentMethodChange}
              placeholder="Choose payment method"
              emptyMessage="No payment methods"
            />
          </div>

          {(requiresPaymentReference || supportsOptionalReference) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{referenceLabel}</p>
              <Input
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                placeholder={requiresPaymentReference ? "Required" : "Optional"}
              />
            </div>
          )}

          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">Cash Input</p>
            <Input readOnly value={amountPaidInput} className="text-right text-lg font-semibold" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'DEL'].map((token) => (
              <Button key={token} type="button" variant={token === 'DEL' ? 'outline' : 'secondary'} onClick={() => onAppendCashDigit(token)}>
                {token}
              </Button>
            ))}
            <Button type="button" variant="outline" className="col-span-3" onClick={() => onAppendCashDigit('C')}>Clear</Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 2000].map((amount) => (
              <Button key={amount} type="button" variant="ghost" onClick={() => onApplyQuickCash(amount)}>
                {formatMoney(amount)}
              </Button>
            ))}
          </div>

          <Button type="button" variant="ghost" onClick={() => setIsCheckoutStage(false)}>
            Back to Adjustments
          </Button>
        </>
      )}

      <div className="space-y-1 rounded-md border p-3 text-sm mt-auto">
        <div className="flex items-center justify-between"><span>Payment</span><span>{paymentMethodLabel}</span></div>
        <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
        <div className="flex items-center justify-between">
          <span>Discount Applied</span>
          <span>
            {selectedAdjustment
              ? `${selectedAdjustment.name} (${selectedAdjustment.percent}%)`
              : 'None'}
          </span>
        </div>
        <div className="flex items-center justify-between"><span>Discount Amount</span><span>{formatMoney(discount)}</span></div>
        <div className="flex items-center justify-between font-semibold"><span>Total Due</span><span>{formatMoney(totalDue)}</span></div>
        <div className="flex items-center justify-between"><span>Amount Paid</span><span>{formatMoney(paid)}</span></div>
        <div className="flex items-center justify-between"><span>Change</span><span>{formatMoney(change)}</span></div>
      </div>

      {isCheckoutStage && (
        <div className="grid grid-cols-1 gap-2 pt-1">
          <Button type="button" disabled={isLoading} onClick={onCompleteSale}>{isLoading ? 'Processing...' : 'Confirm'}</Button>
        </div>
      )}

      {lastTransaction && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <p className="font-medium">Last transaction</p>
          <p>Transaction Ref: {lastTransaction.receipt_number}</p>
          <p>Total: {formatMoney(lastTransaction.total_due)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Internal tracking copy only. Issue a manual BIR-approved receipt separately.</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onPrintInvoice}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Internal Invoice A4 PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
