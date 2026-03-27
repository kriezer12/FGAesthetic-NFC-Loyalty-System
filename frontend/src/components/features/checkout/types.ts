
export type Customer = {
  id: string
  name: string
  phone?: string | null
}

export type InventoryProduct = {
  id: string
  name: string
  sku?: string
  unit_price: number
}

export type CartItem = {
  id: string
  type: "service" | "product"
  description: string
  service_id?: string
  inventory_product_id?: string
  quantity: number
  unit_price: number
  line_total: number
}

export type CreatedTransaction = {
  id: string
  receipt_number: string
  payment_method?: string | null
  vatable_sales?: number | null
  vat_amount?: number | null
  vat_exempt_sales?: number | null
  subtotal?: number | null
  discount_amount?: number | null
  amount_paid?: number | null
  change_amount?: number | null
  total_due: number
  created_at: string
}

export type BranchMeta = {
  id: string
  name?: string | null
  address?: string | null
}

export type BusinessSettings = {
  business_name?: string | null
  tin?: string | null
  vat_reg_tin?: string | null
  ptu_no?: string | null
  date_issued?: string | null
  pos_serial_no?: string | null
  address?: string | null
}

export type ReceiptSnapshot = {
  transaction: CreatedTransaction
  cartItems: CartItem[]
  subtotal: number
  discountAmount: number
  totalDue: number
  amountPaid: number
  changeAmount: number
  paymentMethodLabel: string
  paymentReference: string
  adjustmentLabel: string
  seniorPwdDiscount: number
  customerName: string
  branchAddress: string
  branchName: string
  businessSettings: BusinessSettings | null
}

export type AdjustmentOption = {
  id: string
  name: string
  percent: number
  enabled?: boolean
  isSystem?: boolean
}

export type LogTx = {
  id: string
  receipt_number: string
  payment_method?: string | null
  notes?: string | null
  status?: string | null
  subtotal?: number | null
  discount_amount?: number | null
  vatable_sales?: number | null
  vat_amount?: number | null
  vat_exempt_sales?: number | null
  total_due: number
  amount_paid?: number | null
  change_amount?: number | null
  created_at: string
  customer_id?: string | null
  branch_id?: string | null
}

export type LogTxItem = {
  transaction_id: string
  description: string
  quantity: number
  line_total: number
}

export type PosInventoryItem = {
  id: string
  name: string
  sku?: string | null
  unit_price: number
  is_active?: boolean | null
  min_stock_level: number
  reorder_level: number
  danger_level: number
  stock_qty: number
}

export type ZReadingSnapshot = {
  readingNo: number
  branchName: string
  businessDate: string
  generatedAt: string
  txCount: number
  grossSales: number
  discountTotal: number
  netSales: number
  vatableSales: number
  vat_amount?: number // sometimes returned as vat_amount in backend
  vatAmount?: number // used in frontend
  paymentBreakdown: Record<string, number>
}
