import { useEffect, useMemo, useState } from "react"
import { Box, Clock3, Download, Settings2, ShoppingCart, MoreHorizontal } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { supabase } from "@/lib/supabase"
import { apiCall } from "@/lib/api"
import { openInvoiceA4Landscape, type ReceiptTemplateData } from "@/lib/receipt-templates"
import { awardPointsForAppointment } from "@/components/features/calendar/calendar-parts/loyalty-utils"
import { NotificationToast } from "@/components/ui/notification-toast"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Appointment } from "@/types/appointment"
import type { Service } from "@/types/service"

type Customer = {
  id: string
  name: string
  phone?: string | null
}

type CartItem = {
  id: string
  type: "service" | "product"
  description: string
  service_id?: string
  inventory_product_id?: string
  quantity: number
  unit_price: number
  line_total: number
}

type CreatedTransaction = {
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

type BranchMeta = {
  id: string
  name?: string | null
  address?: string | null
}

type BusinessSettings = {
  business_name?: string | null
  tin?: string | null
  vat_reg_tin?: string | null
  ptu_no?: string | null
  date_issued?: string | null
  pos_serial_no?: string | null
  address?: string | null
}

type ReceiptSnapshot = {
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

type AdjustmentOption = {
  id: string
  name: string
  percent: number
  enabled?: boolean
  isSystem?: boolean
}

type LogTx = {
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

type LogTxItem = {
  transaction_id: string
  description: string
  quantity: number
  line_total: number
}

type PosInventoryItem = {
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

type ZReadingSnapshot = {
  readingNo: number
  branchName: string
  businessDate: string
  generatedAt: string
  txCount: number
  grossSales: number
  discountTotal: number
  netSales: number
  vatableSales: number
  vatAmount: number
  paymentBreakdown: Record<string, number>
}

const toAmount = (value: string | number) => {
  const n = typeof value === "number" ? value : parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

const formatMoney = (value: number) => `P${value.toFixed(2)}`

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "gcash", label: "GCash" },
  { value: "paymaya", label: "PayMaya" },
]

const defaultAdjustments: AdjustmentOption[] = [
  { id: "senior", name: "Senior Citizen", percent: 20, enabled: true, isSystem: true },
  { id: "pwd", name: "PWD", percent: 20, enabled: true, isSystem: true },
  { id: "employee", name: "Employee", percent: 10, enabled: true, isSystem: true },
  { id: "vip", name: "VIP", percent: 15, enabled: true, isSystem: true },
]

const localAdjustmentStorageKey = "fg_pos_adjustments"

export default function CheckoutPage() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [billedAppointmentIds, setBilledAppointmentIds] = useState<Set<string>>(new Set())
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  const [selectedAppointmentId, setSelectedAppointmentId] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productQty, setProductQty] = useState("1")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paymentReference, setPaymentReference] = useState("")

  const [selectedAdjustment, setSelectedAdjustment] = useState<AdjustmentOption | null>(null)
  const [adjustmentOptions, setAdjustmentOptions] = useState<AdjustmentOption[]>(defaultAdjustments)
  const [activeView, setActiveView] = useState<"checkout" | "logs" | "inventory">("checkout")
  const [logTransactions, setLogTransactions] = useState<LogTx[]>([])
  const [logSearchQuery, setLogSearchQuery] = useState("")
  const [logItemsByTx, setLogItemsByTx] = useState<Record<string, LogTxItem[]>>({})
  const [logCustomerMap, setLogCustomerMap] = useState<Record<string, string>>({})
  const [logsLoading, setLogsLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<{ id: string, type: 'context' | 'dropdown' } | null>(null)

  const [inventoryRows, setInventoryRows] = useState<PosInventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [inventorySearch, setInventorySearch] = useState("")

  const [zBusinessDate, setZBusinessDate] = useState(new Date().toISOString().slice(0, 10))
  const [zReadingReport, setZReadingReport] = useState<ZReadingSnapshot | null>(null)
  const [zReadingHistory, setZReadingHistory] = useState<ZReadingSnapshot[]>([])
  const [zPanelOpen, setZPanelOpen] = useState(true)
  const [zHistoryPage, setZHistoryPage] = useState(1)
  const [transactionPage, setTransactionPage] = useState(1)

  const zPageSize = 10
  const transactionPageSize = 10

  const [amountPaidInput, setAmountPaidInput] = useState("0")
  const [isCheckoutStage, setIsCheckoutStage] = useState(false)
  const [zConfirmOpen, setZConfirmOpen] = useState(false)

  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<LogTx | null>(null)
  const [voidReason, setVoidReason] = useState("")

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: string; title: string; message: string; type: "warning" | "success" } | null>(null)
  const [lastTransaction, setLastTransaction] = useState<CreatedTransaction | null>(null)
  const [lastReceiptSnapshot, setLastReceiptSnapshot] = useState<ReceiptSnapshot | null>(null)
  const [branchMeta, setBranchMeta] = useState<BranchMeta | null>(null)
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)

  useEffect(() => {
    document.title = "Checkout - FG Aesthetic Centre"
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(localAdjustmentStorageKey)
      if (!raw) {
        setAdjustmentOptions(defaultAdjustments)
        return
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter((p) => typeof p?.id === "string" && typeof p?.name === "string" && Number.isFinite(Number(p?.percent)))
          .map((p) => ({ ...p, enabled: p?.enabled !== false }))
        setAdjustmentOptions(cleaned)
      } else {
        setAdjustmentOptions(defaultAdjustments)
      }
    } catch {
      setAdjustmentOptions(defaultAdjustments)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [
          { data: appointmentsData, error: appointmentsError },
          { data: servicesData, error: servicesError },
          { data: billedData, error: billedError },
          { data: settingsData, error: settingsError },
          { data: customersData, error: customersError },
        ] = await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .in("status", ["scheduled", "confirmed", "in-progress", "completed"])
            .order("start_time", { ascending: false })
            .limit(200),
          supabase
            .from("services")
            .select("id, category_id, name, sort_order, uses_equipment, equipment, uses_product, product, inventory_product_id, price, is_package, session_count, recurrence_days"),
          supabase
            .from("transactions")
            .select("appointment_id")
            .not("appointment_id", "is", null)
            .limit(5000),
          supabase
            .from("business_settings")
            .select("*")
            .eq("id", "default")
            .maybeSingle(),
          supabase
            .from("customers")
            .select("id, name, phone")
            .order("name", { ascending: true }),
        ])

        if (appointmentsError) throw appointmentsError
        if (servicesError) throw servicesError
        if (billedError) throw billedError
        if (settingsError) throw settingsError
        if (customersError) throw customersError

        setAppointments((appointmentsData || []) as Appointment[])
        setServices((servicesData || []) as Service[])
        setBilledAppointmentIds(new Set((billedData || []).map((row: { appointment_id?: string | null }) => row.appointment_id).filter(Boolean) as string[]))
        setBusinessSettings((settingsData || null) as BusinessSettings | null)
        setCustomers((customersData || []) as Customer[])
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load checkout data")
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    const fetchBranchMeta = async () => {
      if (!userProfile?.branch_id) {
        setBranchMeta(null)
        return
      }

      const { data } = await supabase
        .from("branches")
        .select("id, name, address")
        .eq("id", userProfile.branch_id)
        .maybeSingle()

      if (data) setBranchMeta(data as BranchMeta)
    }

    void fetchBranchMeta()
    
    // Always pre-load POS inventory strictly to inform cart product dropdown.
    if (userProfile !== undefined) {
      void loadInventory()
    }
  }, [userProfile?.branch_id])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const initialApptId = params.get("appointmentId")
    if (initialApptId && appointments.length > 0 && services.length > 0 && selectedAppointmentId === "") {
      // Clear the query string to avoid re-triggering if user clears cart
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      addAppointmentServicesToCart(initialApptId)
    }
  }, [location.search, appointments, services, selectedAppointmentId])

  const billableAppointments = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    const groupHasBilled = new Map<string, boolean>()

    for (const appointment of sorted) {
      const groupKey = appointment.recurrence_group_id || appointment.id
      if (billedAppointmentIds.has(appointment.id)) groupHasBilled.set(groupKey, true)
    }

    const seenGroups = new Set<string>()
    const result: Appointment[] = []

    for (const appointment of sorted) {
      const groupKey = appointment.recurrence_group_id || appointment.id
      if (seenGroups.has(groupKey)) continue
      seenGroups.add(groupKey)
      if (groupHasBilled.get(groupKey)) continue
      result.push(appointment)
    }

    return result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [appointments, billedAppointmentIds])

  const packageQueueByCustomer = useMemo(() => {
    const grouped = new Map<string, Appointment[]>()

    for (const appointment of billableAppointments) {
      const customerKey = appointment.customer_id || appointment.customer_name || "walk-in"
      const current = grouped.get(customerKey) || []
      current.push(appointment)
      grouped.set(customerKey, current)
    }

    const queueMap = new Map<string, number>()
    for (const [, list] of grouped) {
      const sorted = [...list].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      sorted.forEach((appointment, index) => queueMap.set(appointment.id, index + 1))
    }

    return queueMap
  }, [billableAppointments])

  const appointmentOptions = useMemo(
    () =>
      billableAppointments.map((appointment) => ({
        value: appointment.id,
        label: `${appointment.customer_name || "Walk-in"} • ${appointment.title} • ${new Date(appointment.start_time).toLocaleString()}`,
        description: appointment.recurrence_group_id
          ? `Package queue #${packageQueueByCustomer.get(appointment.id) || 1} (bill once)`
          : "Single appointment",
      })),
    [billableAppointments, packageQueueByCustomer],
  )

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` (${c.phone})` : ""}` })),
    [customers],
  )

  const productOptions = useMemo(
    () => inventoryRows
      .filter((row) => row.is_active !== false && row.stock_qty > 0)
      .map((row) => ({ value: row.id, label: `${row.name}${row.sku ? ` (${row.sku})` : ""} - In stock: ${row.stock_qty}` })),
    [inventoryRows],
  )

  const paymentMethodLabel = useMemo(
    () => paymentMethodOptions.find((opt) => opt.value === paymentMethod)?.label || paymentMethod,
    [paymentMethod],
  )
  const visibleAdjustments = useMemo(
    () => adjustmentOptions.filter((option) => option.enabled !== false),
    [adjustmentOptions],
  )
  const filteredInventoryRows = useMemo(() => {
    const keyword = inventorySearch.trim().toLowerCase()
    if (!keyword) return inventoryRows
    return inventoryRows.filter((row) => {
      const name = row.name.toLowerCase()
      const sku = (row.sku || "").toLowerCase()
      return name.includes(keyword) || sku.includes(keyword)
    })
  }, [inventoryRows, inventorySearch])
  const totalZHistoryPages = Math.max(1, Math.ceil(zReadingHistory.length / zPageSize))
  const paginatedZReadings = useMemo(() => {
    const start = (zHistoryPage - 1) * zPageSize
    return zReadingHistory.slice(start, start + zPageSize)
  }, [zReadingHistory, zHistoryPage])
  const filteredLogTransactions = useMemo(() => {
    const keyword = logSearchQuery.trim().toLowerCase()
    if (!keyword) return logTransactions
    return logTransactions.filter((tx) => {
      const ref = (tx.receipt_number || "").toLowerCase()
      const method = (tx.payment_method || "").toLowerCase()
      const status = (tx.status || "").toLowerCase()
      const total = Number(tx.total_due || 0).toString()
      return ref.includes(keyword) || method.includes(keyword) || status.includes(keyword) || total.includes(keyword)
    })
  }, [logTransactions, logSearchQuery])
  const totalTransactionPages = Math.max(1, Math.ceil(filteredLogTransactions.length / transactionPageSize))
  const paginatedTransactions = useMemo(() => {
    const start = (transactionPage - 1) * transactionPageSize
    return filteredLogTransactions.slice(start, start + transactionPageSize)
  }, [filteredLogTransactions, transactionPage])
  const requiresPaymentReference = paymentMethod === "gcash" || paymentMethod === "paymaya"
  const supportsOptionalReference = paymentMethod === "card"
  const referenceLabel = useMemo(() => {
    if (paymentMethod === "gcash") return "GCash Reference No."
    if (paymentMethod === "paymaya") return "PayMaya Reference No."
    if (paymentMethod === "card") return "Card Approval / Ref No. (optional)"
    return "Payment Reference"
  }, [paymentMethod])

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.line_total, 0), [cartItems])
  const discountPercent = selectedAdjustment?.percent || 0
  const discount = useMemo(() => subtotal * (discountPercent / 100), [subtotal, discountPercent])
  const totalDue = Math.max(subtotal - discount, 0)
  const paid = toAmount(amountPaidInput)
  const change = Math.max(paid - totalDue, 0)

  const addAppointmentServicesToCart = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId)
    setErrorMessage(null)
    setSuccessMessage(null)

    const appointment = appointments.find((a) => a.id === appointmentId)
    if (!appointment) return

    if (appointment.customer_id) setSelectedCustomerId(appointment.customer_id)

    const ids = appointment.service_ids || []
    const nextItems: CartItem[] = ids
      .map((serviceId) => services.find((service) => service.id === serviceId))
      .filter((service): service is Service => Boolean(service))
      .map((service) => ({
        id: crypto.randomUUID(),
        type: "service",
        description: service.name,
        service_id: service.id,
        inventory_product_id: service.inventory_product_id,
        quantity: 1,
        unit_price: toAmount(service.price),
        line_total: toAmount(service.price),
      }))

    setCartItems(nextItems)
    setIsCheckoutStage(false)
  }

  const addProductToCart = () => {
    if (!selectedProductId) return
    const qty = Math.max(1, Math.floor(toAmount(productQty)))
    const product = inventoryRows.find((p) => p.id === selectedProductId)
    if (!product) return

    const unitPrice = toAmount(product.unit_price)

    setCartItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "product",
        description: product.name,
        inventory_product_id: product.id,
        quantity: qty,
        unit_price: unitPrice,
        line_total: unitPrice * qty,
      },
    ])

    setSelectedProductId("")
    setProductQty("1")
    setIsCheckoutStage(false)
  }

  const removeCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
    setIsCheckoutStage(false)
  }

  const applyAdjustment = (option: AdjustmentOption | null) => {
    setSelectedAdjustment(option)
  }

  const resetAdjustments = () => {
    setSelectedAdjustment(null)
  }

  const appendCashDigit = (token: string) => {
    setAmountPaidInput((prev) => {
      const current = prev || "0"
      if (token === "C") return "0"
      if (token === "DEL") return current.length <= 1 ? "0" : current.slice(0, -1)
      if (token === ".") return current.includes(".") ? current : `${current}.`
      return current === "0" ? token : `${current}${token}`
    })
  }

  const applyQuickCash = (amount: number) => {
    setAmountPaidInput((prev) => {
      const current = parseFloat(prev || "0")
      return String(current + amount)
    })
  }

  const buildTemplateData = (receipt: ReceiptSnapshot, modeLabel: ReceiptTemplateData["modeLabel"]): ReceiptTemplateData => {
    const tx = receipt.transaction
    const vatAmount = typeof tx.vat_amount === "number" ? tx.vat_amount : Number((receipt.totalDue - receipt.totalDue / 1.12).toFixed(2))
    const salesNetOfVat = Number((receipt.totalDue - vatAmount).toFixed(2))
    const vatableSale = typeof tx.vatable_sales === "number" ? tx.vatable_sales : Number((receipt.totalDue / 1.12).toFixed(2))
    const vatExemptSale = typeof tx.vat_exempt_sales === "number" ? tx.vat_exempt_sales : Number(receipt.discountAmount.toFixed(2))
    const discountLabel = receipt.adjustmentLabel || ""

    return {
      modeLabel,
      businessName: receipt.businessSettings?.business_name || "FG Aesthetic Clinic",
      vatTin: receipt.businessSettings?.vat_reg_tin || receipt.businessSettings?.tin || undefined,
      branchAddress: receipt.branchAddress || undefined,
      ptuNo: receipt.businessSettings?.ptu_no || undefined,
      dateIssued: receipt.businessSettings?.date_issued || undefined,
      posSerialNo: receipt.businessSettings?.pos_serial_no || undefined,
      transactionDate: tx.created_at ? new Date(tx.created_at).toLocaleString() : new Date().toLocaleString(),
      receiptNo: tx.receipt_number || "",
      customerName: receipt.customerName || undefined,
      branchName: receipt.branchName || undefined,
      items: receipt.cartItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        lineTotal: item.line_total,
      })),
      subtotal: receipt.subtotal,
      lessVat: vatAmount,
      salesNetOfVat,
      seniorPwdDiscount: receipt.seniorPwdDiscount,
      discountLabel,
      discountAmount: receipt.discountAmount,
      total: receipt.totalDue,
      amountPaid: receipt.amountPaid,
      changeAmount: receipt.changeAmount,
      zeroRatedSale: 0,
      vatExemptSale,
      vatableSale,
      vatAmount,
      paymentMethod: receipt.paymentMethodLabel,
      paymentReference: receipt.paymentReference || undefined,
    }
  }

  const parsePaymentReference = (notes?: string | null) => {
    if (!notes) return ""
    const match = notes.match(/Payment Reference \([^)]*\):\s*(.*)$/i)
    return match?.[1]?.trim() || ""
  }

  const buildLogTemplateData = (tx: LogTx, modeLabel: ReceiptTemplateData["modeLabel"]): ReceiptTemplateData => {
    const total = Number(tx.total_due || 0)
    const vatAmount = typeof tx.vat_amount === "number" ? tx.vat_amount : Number((total - total / 1.12).toFixed(2))
    const branchName = branchMeta?.name || "N/A"
    const branchAddress = branchMeta?.address || businessSettings?.address || "NOT SET"

    return {
      modeLabel,
      businessName: businessSettings?.business_name || "FG Aesthetic Clinic",
      vatTin: businessSettings?.vat_reg_tin || businessSettings?.tin || undefined,
      branchAddress,
      ptuNo: businessSettings?.ptu_no || undefined,
      dateIssued: businessSettings?.date_issued || undefined,
      posSerialNo: businessSettings?.pos_serial_no || undefined,
      transactionDate: new Date(tx.created_at).toLocaleString(),
      receiptNo: tx.receipt_number,
      customerName: tx.customer_id ? logCustomerMap[tx.customer_id] : undefined,
      branchName,
      items: (logItemsByTx[tx.id] || []).map((item) => ({
        description: item.description,
        quantity: Number(item.quantity || 0),
        lineTotal: Number(item.line_total || 0),
      })),
      subtotal: Number(tx.subtotal || 0),
      lessVat: vatAmount,
      salesNetOfVat: Number((total - vatAmount).toFixed(2)),
      discountAmount: Number(tx.discount_amount || 0),
      discountLabel: Number(tx.discount_amount || 0) > 0 ? "Adjustment" : "",
      total,
      amountPaid: Number(tx.amount_paid || 0),
      changeAmount: Number(tx.change_amount || 0),
      zeroRatedSale: 0,
      vatExemptSale: Number(tx.vat_exempt_sales || 0),
      vatableSale: Number(tx.vatable_sales || 0),
      vatAmount,
      paymentMethod: tx.payment_method || "cash",
      paymentReference: parsePaymentReference(tx.notes) || undefined,
    }
  }

  const loadZReadings = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error("Missing session token")

      const res = await apiCall(`/pos/z-readings?page=1&per_page=100`, { 
        method: "GET", 
        authToken: accessToken 
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || "Failed to load z-reading history")

      const rawReadings = (body?.z_readings || []) as any[]
      const readings: ZReadingSnapshot[] = rawReadings.map(row => ({
         readingNo: Number(row.reading_no),
         branchName: branchMeta?.name || "Branch",
         businessDate: row.business_date,
         generatedAt: row.generated_at,
         txCount: Number(row.tx_count || 0),
         grossSales: Number(row.gross_sales || 0),
         discountTotal: Number(row.discount_total || 0),
         netSales: Number(row.net_sales || 0),
         vatableSales: Number(row.vatable_sales || 0),
         vatAmount: Number(row.vat_amount || 0),
         paymentBreakdown: typeof row.payment_breakdown === 'object' ? row.payment_breakdown : JSON.parse(row.payment_breakdown || "{}")
      }))

      setZReadingHistory(readings)
      if (!zReadingReport && readings.length > 0) {
        setZReadingReport(readings[0])
      }
    } catch (err) {
      console.warn("Z-reading load failed (API)", err)
    }
  }

  const persistZReading = async (snapshot: ZReadingSnapshot) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error("Missing session")

      const payload = {
        branch_id: userProfile?.branch_id || null,
        business_date: snapshot.businessDate,
        reading_no: snapshot.readingNo,
        generated_at: snapshot.generatedAt,
        tx_count: snapshot.txCount,
        gross_sales: snapshot.grossSales,
        discount_total: snapshot.discountTotal,
        net_sales: snapshot.netSales,
        vatable_sales: snapshot.vatableSales,
        vat_amount: snapshot.vatAmount,
        payment_breakdown: snapshot.paymentBreakdown,
      }

      const res = await apiCall("/pos/z-readings", {
        method: "POST",
        authToken: accessToken,
        body: JSON.stringify(payload),
      })
      
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || "Failed to save z-reading")
      
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to persist z-reading"
      setErrorMessage(errorMsg)
      return false
    }
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error("Missing session token")

      const txRes = await apiCall("/pos/transactions", { method: "GET", authToken: accessToken })
      const txBody = await txRes.json()
      if (!txRes.ok) throw new Error(txBody?.error || "Failed to fetch transaction logs")

      await loadZReadings()

      const txRows = (txBody?.transactions || []) as LogTx[]
      setLogTransactions(txRows)
      setTransactionPage(1)

      const txIds = txRows.map((tx) => tx.id)
      if (txIds.length > 0) {
        const { data: itemRows, error: itemErr } = await supabase
          .from("transaction_items")
          .select("transaction_id, description, quantity, line_total")
          .in("transaction_id", txIds)

        if (itemErr) throw itemErr

        const grouped: Record<string, LogTxItem[]> = {}
        for (const item of (itemRows || []) as LogTxItem[]) {
          if (!grouped[item.transaction_id]) grouped[item.transaction_id] = []
          grouped[item.transaction_id].push(item)
        }
        setLogItemsByTx(grouped)
      } else {
        setLogItemsByTx({})
      }

      const customerIds = Array.from(new Set(txRows.map((tx) => tx.customer_id).filter(Boolean))) as string[]
      if (customerIds.length > 0) {
        const { data: customersData, error: customerErr } = await supabase
          .from("customers")
          .select("id, name")
          .in("id", customerIds)
        if (customerErr) throw customerErr

        const map: Record<string, string> = {}
        for (const customer of customersData || []) {
          map[(customer as any).id] = (customer as any).name || "Walk-in"
        }
        setLogCustomerMap(map)
      } else {
        setLogCustomerMap({})
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load logs"
      setErrorMessage(message)
    } finally {
      setLogsLoading(false)
    }
  }

  const loadInventory = async () => {
    setInventoryLoading(true)
    setInventoryError(null)

    try {
      let productsData: any[] | null = null
      let productsError: any = null

      const primary = await supabase
        .from("inventory_products")
        .select("id, name, sku, unit_price, is_active, min_stock_level, reorder_level, danger_level")
        .order("name", { ascending: true })

      productsData = primary.data as any[] | null
      productsError = primary.error

      // Fallback for older schemas where optional inventory fields are not present yet.
      if (productsError) {
        const fallback = await supabase
          .from("inventory_products")
          .select("id, name, sku, unit_price")
          .order("name", { ascending: true })

        productsData = fallback.data as any[] | null
        productsError = fallback.error
      }

      if (productsError) throw productsError

      const { data: stocksData, error: stocksError } = userProfile?.branch_id
        ? await supabase
            .from("inventory_stocks")
            .select("product_id, quantity")
            .eq("branch_id", userProfile.branch_id)
        : await supabase
            .from("inventory_stocks")
            .select("product_id, quantity")

      if (stocksError) throw stocksError

      const stockMap = new Map<string, number>()
      for (const row of stocksData || []) {
        const productId = (row as any).product_id as string
        const qty = Number((row as any).quantity || 0)
        stockMap.set(productId, (stockMap.get(productId) || 0) + qty)
      }

      const mapped = ((productsData || []) as any[]).map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: Number(product.unit_price || 0),
        is_active: product.is_active ?? true,
        min_stock_level: Number(product.min_stock_level || 0),
        reorder_level: Number(product.reorder_level || 0),
        danger_level: Number(product.danger_level || 0),
        stock_qty: stockMap.get(product.id) || 0,
      }))

      setInventoryRows(mapped)
    } catch (err) {
      setInventoryError(err instanceof Error ? err.message : "Failed to load inventory")
      setErrorMessage(err instanceof Error ? err.message : "Failed to load inventory")
    } finally {
      setInventoryLoading(false)
    }
  }

  const buildZReadingSnapshot = (
    businessDate: string,
    filteredTransactions: LogTx[],
    readingNo: number,
  ): ZReadingSnapshot => {
    const paymentBreakdown: Record<string, number> = {}
    for (const tx of filteredTransactions) {
      const key = (tx.payment_method || "cash").toLowerCase()
      paymentBreakdown[key] = (paymentBreakdown[key] || 0) + Number(tx.total_due || 0)
    }

    return {
      readingNo,
      branchName: branchMeta?.name || "Branch",
      businessDate,
      generatedAt: new Date().toISOString(),
      txCount: filteredTransactions.length,
      grossSales: filteredTransactions.reduce((sum, tx) => sum + Number(tx.subtotal || 0), 0),
      discountTotal: filteredTransactions.reduce((sum, tx) => sum + Number(tx.discount_amount || 0), 0),
      netSales: filteredTransactions.reduce((sum, tx) => sum + Number(tx.total_due || 0), 0),
      vatableSales: filteredTransactions.reduce((sum, tx) => sum + Number(tx.vatable_sales || 0), 0),
      vatAmount: filteredTransactions.reduce((sum, tx) => sum + Number(tx.vat_amount || 0), 0),
      paymentBreakdown,
    }
  }

  const generateXReading = () => {
    const filtered = logTransactions.filter((tx) => {
      if (tx.status === "voided") return false
      const txDate = new Date(tx.created_at)
      const dateKey = txDate.toISOString().slice(0, 10)
      return dateKey === zBusinessDate
    })

    if (filtered.length === 0) {
      setErrorMessage("No sales transactions found for previewing X-Reading.")
      return
    }

    const snapshot = buildZReadingSnapshot(zBusinessDate, filtered, 0)
    printZReading(snapshot, true)
    setSuccessMessage(`X-Reading report generated for ${zBusinessDate}. Sales counter remains active.`)
  }

  const triggerZReadingConfirm = () => {
    console.debug("triggerZReadingConfirm", { zBusinessDate, zReadingHistoryLength: zReadingHistory.length })
    const alreadyExists = zReadingHistory.some((z) => z.businessDate === zBusinessDate)
    if (alreadyExists) {
      setErrorMessage(`A Z-Reading has already been generated for ${zBusinessDate}. This report can only be finalized once per operational day.`)
      return
    }
    setZConfirmOpen(true)
  }

  const triggerVoidTransaction = (tx: LogTx) => {
    setVoidTarget(tx)
    setVoidReason("")
    setVoidConfirmOpen(true)
  }

  const confirmVoidTransaction = async () => {
    if (!voidTarget) return
    if (!voidReason.trim()) {
      setErrorMessage("A valid reason is required to void this transaction.")
      return
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.access_token) throw new Error("Missing session")

      const { error } = await supabase
         .from("transactions")
         .update({ 
           status: "voided",
           notes: (voidTarget.notes ? voidTarget.notes + "\n" : "") + `VOIDED: ${voidReason.trim()}`
         })
         .eq("id", voidTarget.id)
      
      if (error) throw error

      const { data: txItemsData } = await supabase
         .from("transaction_items")
         .select("id, inventory_product_id, quantity")
         .eq("transaction_id", voidTarget.id)

      if (txItemsData && txItemsData.length > 0) {
        for (const item of txItemsData) {
           if (item.inventory_product_id) {
             const branchId = voidTarget.branch_id || userProfile?.branch_id
             
             const { data: stockData } = await supabase
                .from("inventory_stocks")
                .select("quantity")
                .eq("product_id", item.inventory_product_id)
                .eq("branch_id", branchId)
                .maybeSingle()

             const currentQty = stockData ? (stockData.quantity || 0) : 0
             const newQty = currentQty + (item.quantity || 0)

             await supabase
                .from("inventory_stocks")
                .upsert({
                   product_id: item.inventory_product_id,
                   branch_id: branchId,
                   quantity: newQty,
                   updated_at: new Date().toISOString()
                }, { onConflict: "product_id,branch_id" })

             await supabase
                .from("inventory_transactions")
                .insert({
                   id: crypto.randomUUID(),
                   product_id: item.inventory_product_id,
                   branch_id: branchId,
                   type: "in",
                   quantity: item.quantity,
                   previous_quantity: currentQty,
                   new_quantity: newQty,
                   reason: `Voided Receipt ${voidTarget.receipt_number}`,
                   performed_by: userProfile?.id
                })
           }
        }
      }

      setLogTransactions(prev => prev.map(tx => tx.id === voidTarget.id ? { ...tx, status: "voided", notes: (tx.notes ? tx.notes + "\n" : "") + `VOIDED: ${voidReason.trim()}` } : tx))
      
      try {
        await supabase.from("user_logs").insert({
           user_id: sessionData.session.user.id,
           user_email: sessionData.session.user.email,
           user_name: userProfile?.full_name || sessionData.session.user.email,
           action_type: "voided_transactions",
           entity_type: "transaction",
           entity_id: voidTarget.id,
           entity_name: `[REFUND] Receipt #${voidTarget.receipt_number}`,
           branch_id: voidTarget.branch_id || userProfile?.branch_id,
           metadata: { reason: voidReason.trim(), receipt: voidTarget.receipt_number }
        });
      } catch (err) {
        console.warn("Failed to generate independent user_log for void", err)
      }

      setSuccessMessage(`Transaction ${voidTarget.receipt_number} voided successfully.`)
      setVoidConfirmOpen(false)
      setVoidTarget(null)
      void loadInventory()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to void transaction.")
    }
  }

  const generateZReading = async () => {
    console.debug("generateZReading", { zBusinessDate, zReadingHistoryLength: zReadingHistory.length })
    // 1. Filter log transactions exactly like X-Reading (excluding voided)
    const filtered = logTransactions.filter((tx) => {
      if (tx.status === "voided") return false
      const txDate = new Date(tx.created_at)
      const dateKey = txDate.toISOString().slice(0, 10)
      return dateKey === zBusinessDate
    })

    if (filtered.length === 0) {
      setErrorMessage(`No sales transactions found to finalize for ${zBusinessDate}.`)
      setZConfirmOpen(false)
      return
    }

    // 2. Build snapshot with incremental reading number
    const lastNo = zReadingHistory.length > 0 
      ? Math.max(...zReadingHistory.map((z) => z.readingNo)) 
      : 0
    const snapshot = buildZReadingSnapshot(zBusinessDate, filtered, lastNo + 1)

    // 3. Immediate print to bypass popup blocker
    printZReading(snapshot, false)

    // 4. Persistence
    const saved = await persistZReading(snapshot)
    
    if (saved) {
      setZReadingReport(snapshot)
      setZReadingHistory(prev => [snapshot, ...prev])
      setZHistoryPage(1)
      setSuccessMessage(`Z-Reading #${snapshot.readingNo} for ${snapshot.businessDate} finalized and printed.`)
    } else {
      // Error message is set in persistZReading
    }

    setZConfirmOpen(false)
  }

  const printZReading = (z: ZReadingSnapshot, isXReading = false) => {
    if (typeof window === "undefined") return

    const reportTitle = `${z.branchName || branchMeta?.name || "Branch"} - ${isXReading ? "X" : "Z"}-Reading Report`

    const rows = Object.entries(z.paymentBreakdown)
      .map(([method, amount]) => `<tr><td>${method.toUpperCase()}</td><td style="text-align:right;">${formatMoney(amount)}</td></tr>`)
      .join("")

    const popup = window.open("", "_blank", "width=900,height=760")
    if (!popup) return

    popup.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @page { size: A4 portrait; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; }
            h1 { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f7f7f7; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <div>Reading Type: <strong>${isXReading ? "X-READING (PREVIEW)" : "Z-READING (FINAL)"}</strong></div>
          <div>Reading No: <strong>${z.readingNo === 0 ? "N/A" : z.readingNo}</strong></div>
          <div>Business Date: <strong>${z.businessDate}</strong></div>
          <div>Generated At: ${new Date(z.generatedAt).toLocaleString()}</div>
          <div>Transactions: ${z.txCount}</div>

          <table>
            <thead><tr><th>Metric</th><th style="text-align:right;">Amount</th></tr></thead>
            <tbody>
              <tr><td>Gross Sales</td><td style="text-align:right;">${formatMoney(z.grossSales)}</td></tr>
              <tr><td>Total Discounts</td><td style="text-align:right;">${formatMoney(z.discountTotal)}</td></tr>
              <tr><td>Net Sales</td><td style="text-align:right;">${formatMoney(z.netSales)}</td></tr>
              <tr><td>Vatable Sales</td><td style="text-align:right;">${formatMoney(z.vatableSales)}</td></tr>
              <tr><td>VAT Amount</td><td style="text-align:right;">${formatMoney(z.vatAmount)}</td></tr>
            </tbody>
          </table>

          <table>
            <thead><tr><th>Payment Method</th><th style="text-align:right;">Amount</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `)

    popup.document.close()
    popup.focus()
    popup.print()
  }

  useEffect(() => {
    if (activeView !== "logs" || logsLoading || logTransactions.length === 0) return

    const now = new Date()
    now.setDate(now.getDate() - 1)
    const previousDate = now.toISOString().slice(0, 10)

    if (zReadingHistory.some((entry) => entry.businessDate === previousDate)) return

    const previousDayTransactions = logTransactions.filter((tx) => {
      const key = new Date(tx.created_at).toISOString().slice(0, 10)
      return key === previousDate
    })

    if (previousDayTransactions.length === 0) return

    const lastNo = zReadingHistory.length > 0 ? Math.max(...zReadingHistory.map((z) => z.readingNo)) : 0
    const snapshot = buildZReadingSnapshot(previousDate, previousDayTransactions, lastNo + 1)
    const nextHistory = [snapshot, ...zReadingHistory]

    void (async () => {
      const saved = await persistZReading(snapshot)
      if (!saved) {
        setErrorMessage("Auto-generated z-reading could not be persisted to server.")
      }
    })()

    setZReadingReport(snapshot)
    setZReadingHistory(nextHistory)
    setZHistoryPage(1)
    setSuccessMessage(`Auto-generated end-of-day Z-Reading #${snapshot.readingNo} for ${snapshot.businessDate}.`)
  }, [activeView, logsLoading, logTransactions, zReadingHistory, branchMeta?.name])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("view") === "logs") {
      setActiveView("logs")
      setTransactionPage(1)
      setZHistoryPage(1)
      void loadLogs()
    } else if (params.get("view") === "inventory") {
      setActiveView("inventory")
      void loadInventory()
    }
  }, [location.search])

  useEffect(() => {
    if (zHistoryPage > totalZHistoryPages) {
      setZHistoryPage(totalZHistoryPages)
    }
  }, [zHistoryPage, totalZHistoryPages])

  useEffect(() => {
    if (transactionPage > totalTransactionPages) {
      setTransactionPage(totalTransactionPages)
    }
  }, [transactionPage, totalTransactionPages])

  useEffect(() => {
    if (errorMessage) {
      setToast({
        id: crypto.randomUUID(),
        title: "POS Warning",
        message: errorMessage,
        type: "warning",
      })
    }
  }, [errorMessage])

  useEffect(() => {
    if (successMessage) {
      setToast({
        id: crypto.randomUUID(),
        title: "POS Confirmation",
        message: successMessage,
        type: "success",
      })
    }
  }, [successMessage])

  const printInvoiceA4 = () => {
    if (!lastReceiptSnapshot) {
      setErrorMessage("No invoice available to print yet.")
      return
    }
    openInvoiceA4Landscape(buildTemplateData(lastReceiptSnapshot, "INTERNAL ORIGINAL"))
  }

  const proceedToCheckout = () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (cartItems.length === 0) {
      setErrorMessage("Cart is empty.")
      return
    }

    setIsCheckoutStage(true)
  }

  const completeSale = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (cartItems.length === 0) {
      setErrorMessage("Cart is empty.")
      return
    }
    if (!userProfile?.branch_id && userProfile?.role !== "super_admin") {
      setErrorMessage("Your account has no branch assignment.")
      return
    }
    if (requiresPaymentReference && !paymentReference.trim()) {
      setErrorMessage(`Please enter ${referenceLabel}.`)
      return
    }

    if (paid < totalDue) {
      setErrorMessage(`Insufficient payment. Amount must be at least ₱${totalDue.toFixed(2)}.`)
      return
    }

    setIsLoading(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error("Missing session token. Please sign in again.")

      const payload = {
        branch_id: userProfile?.branch_id || null,
        appointment_id: selectedAppointmentId || null,
        customer_id: selectedCustomerId || null,
        payment_method: paymentMethod,
        notes: paymentReference.trim() ? `Payment Reference (${paymentMethodLabel}): ${paymentReference.trim()}` : null,
        subtotal,
        discount_amount: discount,
        amount_paid: paid,
        items: cartItems.map((item) => ({
          service_id: item.service_id || null,
          inventory_product_id: item.inventory_product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
        })),
      }

      const response = await apiCall("/pos/transactions", {
        method: "POST",
        authToken: accessToken,
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data?.success) {
        const message = data?.details
          ? `${data?.error || "Failed to complete sale"}: ${data.details}`
          : (data?.error || "Failed to complete sale")
        throw new Error(message)
      }

      const transaction = data.transaction as CreatedTransaction
      const effectiveChangeAmount =
        typeof transaction.change_amount === "number"
          ? transaction.change_amount
          : Math.max(paid - totalDue, 0)
      const receiptSnapshot: ReceiptSnapshot = {
        transaction,
        cartItems: [...cartItems],
        subtotal,
        discountAmount: discount,
        totalDue,
        amountPaid: paid,
        changeAmount: effectiveChangeAmount,
        paymentMethodLabel,
        paymentReference: paymentReference.trim(),
        adjustmentLabel: selectedAdjustment ? `${selectedAdjustment.name} (${selectedAdjustment.percent}%)` : "",
        seniorPwdDiscount: selectedAdjustment && ["senior", "pwd"].includes(selectedAdjustment.id) ? discount : 0,
        customerName: selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name || "Walk-in" : "Walk-in",
        branchAddress: branchMeta?.address || businessSettings?.address || "NOT SET",
        branchName: branchMeta?.name || "N/A",
        businessSettings,
      }

      setLastTransaction(transaction)
      setLastReceiptSnapshot(receiptSnapshot)
      setSuccessMessage(`Transaction confirmed. Ref: ${transaction.receipt_number}`)

      // Confirm action generates invoice only.
      openInvoiceA4Landscape(buildTemplateData(receiptSnapshot, "INTERNAL ORIGINAL"))
      
      // Award loyalty points directly after checkout instead of inside calendar view to prevent redundancy
      const fullAppt = appointments.find((a) => a.id === selectedAppointmentId)
      if (fullAppt) {
        awardPointsForAppointment(fullAppt, true).catch(e => console.error("Failed to award points:", e))
      }

      setCartItems([])
      setSelectedAppointmentId("")
      setSelectedCustomerId("")
      setSelectedProductId("")
      setAmountPaidInput("0")
      setPaymentMethod("cash")
      setPaymentReference("")
      setIsCheckoutStage(false)
      setActiveView("checkout")
      resetAdjustments()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Checkout failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="pointer-events-none fixed top-4 right-4 z-[100] flex max-w-[400px] flex-col items-end gap-3">
          <NotificationToast
            id={toast.id}
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => {
              setToast(null)
              setErrorMessage(null)
              setSuccessMessage(null)
            }}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            <h1 className="text-2xl font-bold">POS Checkout</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={activeView === "inventory" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveView("inventory")
                void loadInventory()
              }}
            >
              <Box className="mr-2 h-4 w-4" />
              Inventory
            </Button>
            {userProfile?.role !== "staff" && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => navigate("/dashboard/pos-settings")}> 
                  <Settings2 className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button
                  type="button"
                  variant={activeView === "logs" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveView("logs")
                    void loadLogs()
                  }}
                >
                  <Clock3 className="mr-2 h-4 w-4" />
                  Logs
                </Button>
              </>
            )}
            <Button
              type="button"
              variant={activeView === "checkout" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("checkout")}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              POS
            </Button>
          </div>
        </div>

        {activeView === "checkout" ? (
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] w-full">
          <Card className="rounded-none border-0 border-r shadow-none min-w-0">
          <CardHeader>
            <CardTitle>Cart Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Load from Appointment</p>
              <Combobox
                options={appointmentOptions}
                value={selectedAppointmentId}
                onValueChange={addAppointmentServicesToCart}
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
                onValueChange={setSelectedCustomerId}
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
                  onValueChange={setSelectedProductId}
                  placeholder="Select product"
                  emptyMessage="No products found"
                />
                <Input type="number" min={1} value={productQty} onChange={(e) => setProductQty(e.target.value)} placeholder="Qty" />
                <Button type="button" variant="outline" onClick={addProductToCart}>Add Product</Button>
              </div>
            </div>

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
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Cart is empty.</td>
                    </tr>
                  ) : (
                    cartItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(item.line_total)}</td>
                        <td className="px-3 py-2 text-right">
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeCartItem(item.id)}>Remove</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          </Card>

          <Card className="rounded-none border-0 shadow-none min-w-0">
          <CardHeader>
            <CardTitle>{isCheckoutStage ? "Payment Pad" : "Checkout Adjustments"}</CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-[700px] flex-col gap-4">
            {!isCheckoutStage && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Adjustments (Discounts / Promos)</p>
                    {userProfile?.role !== "staff" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => navigate("/dashboard/pos-settings")}>
                        Configure in Settings
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={!selectedAdjustment ? "default" : "outline"}
                      onClick={() => applyAdjustment(null)}
                    >
                      No Adjustment
                    </Button>
                    {visibleAdjustments.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant={selectedAdjustment?.id === option.id ? "default" : "outline"}
                        onClick={() => applyAdjustment(option)}
                      >
                        {option.name} ({option.percent}%)
                      </Button>
                    ))}
                  </div>
                </div>

                <Button type="button" className="w-full" onClick={proceedToCheckout}>
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
                onValueChange={setPaymentMethod}
                placeholder="Choose payment method"
                emptyMessage="No payment methods"
              />
            </div>

            {(requiresPaymentReference || supportsOptionalReference) && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{referenceLabel}</p>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
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
                <Button key={token} type="button" variant={token === 'DEL' ? 'outline' : 'secondary'} onClick={() => appendCashDigit(token)}>
                  {token}
                </Button>
              ))}
              <Button type="button" variant="outline" className="col-span-3" onClick={() => appendCashDigit('C')}>Clear</Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[500, 1000, 2000].map((amount) => (
                <Button key={amount} type="button" variant="ghost" onClick={() => applyQuickCash(amount)}>
                  {formatMoney(amount)}
                </Button>
              ))}
            </div>

            <Button type="button" variant="ghost" onClick={() => setIsCheckoutStage(false)}>
              Back to Adjustments
            </Button>

              </>
            )}

            <div className="space-y-1 rounded-md border p-3 text-sm">
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
                <Button type="button" disabled={isLoading || paid < totalDue} onClick={completeSale}>{isLoading ? 'Processing...' : 'Confirm'}</Button>
              </div>
            )}

            {lastTransaction && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <p className="font-medium">Last transaction</p>
                <p>Transaction Ref: {lastTransaction.receipt_number}</p>
                <p>Total: {formatMoney(toAmount(lastTransaction.total_due))}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Internal tracking copy only. Issue a manual BIR-approved receipt separately.</p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={printInvoiceA4}>
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Internal Invoice A4 PDF
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        </div>
        ) : activeView === "inventory" ? (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">POS Inventory</h2>
                <p className="text-sm text-muted-foreground">Live stock visibility for selling decisions in checkout.</p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Search product or SKU"
                  className="w-64"
                />
                <Button type="button" variant="outline" onClick={() => void loadInventory()} disabled={inventoryLoading}>
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
                        statusNode = <span className="rounded-md bg-primary/20 px-2 py-1 text-xs text-foreground font-semibold whitespace-nowrap">Reorder</span>
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
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">POS Logs</h2>
                <p className="text-sm text-muted-foreground">Internal transaction tracking for the current branch scope.</p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Search receipt, payment..."
                  className="w-64"
                />
                <Button type="button" variant="outline" onClick={() => void loadLogs()} disabled={logsLoading}>
                  {logsLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">End-of-Day Z-Reading</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setZPanelOpen((prev) => !prev)}>
                  {zPanelOpen ? "Close" : "Open"}
                </Button>
              </div>

              {zPanelOpen && (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Business Date</p>
                      <Input type="date" value={zBusinessDate} onChange={(e) => setZBusinessDate(e.target.value)} className="w-48" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={generateXReading}>X-Reading (Preview)</Button>
                      <Button type="button" onClick={triggerZReadingConfirm}>Final Z-Reading</Button>
                    </div>
                    {zReadingReport && (
                      <Button type="button" variant="ghost" onClick={() => printZReading(zReadingReport)}>
                        <Download className="mr-2 h-4 w-4" />
                        Print Z-Reading
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    X-Reading is a preview of the day's sales. Final Z-Reading signifies the end of the operational day and can only be done once.
                  </p>

                  {zReadingReport && (
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div className="rounded border p-2"><span className="text-muted-foreground">Reading</span><div className="font-medium">#{zReadingReport.readingNo}</div></div>
                      <div className="rounded border p-2"><span className="text-muted-foreground">Net Sales</span><div className="font-medium">{formatMoney(zReadingReport.netSales)}</div></div>
                      <div className="rounded border p-2"><span className="text-muted-foreground">Transactions</span><div className="font-medium">{zReadingReport.txCount}</div></div>
                    </div>
                  )}

                  {zReadingHistory.length > 0 && (
                    <>
                      <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 text-left">Reading No</th>
                              <th className="px-3 py-2 text-left">Branch</th>
                              <th className="px-3 py-2 text-left">Business Date</th>
                              <th className="px-3 py-2 text-right">Net Sales</th>
                              <th className="px-3 py-2 text-right">Tx Count</th>
                              <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedZReadings.map((z) => (
                              <tr key={`${z.readingNo}-${z.generatedAt}`} className="border-t">
                                <td className="px-3 py-2 font-medium">#{z.readingNo}</td>
                                <td className="px-3 py-2">{z.branchName || branchMeta?.name || "Branch"}</td>
                                <td className="px-3 py-2">{z.businessDate}</td>
                                <td className="px-3 py-2 text-right">{formatMoney(z.netSales)}</td>
                                <td className="px-3 py-2 text-right">{z.txCount}</td>
                                <td className="px-3 py-2 text-right">
                                  <Button type="button" size="sm" variant="outline" onClick={() => printZReading(z)}>
                                    Print
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Page {zHistoryPage} of {totalZHistoryPages}</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={zHistoryPage <= 1}
                            onClick={() => setZHistoryPage((prev) => Math.max(1, prev - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={zHistoryPage >= totalZHistoryPages}
                            onClick={() => setZHistoryPage((prev) => Math.min(totalZHistoryPages, prev + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Transaction Ref</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Payment</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading logs...</td>
                    </tr>
                  ) : logTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No transactions found.</td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <ContextMenu 
                        key={tx.id} 
                        open={openMenuId?.id === tx.id && openMenuId.type === 'context'} 
                        onOpenChange={(o) => setOpenMenuId(o ? { id: tx.id, type: 'context' } : null)}
                      >
                        <ContextMenuTrigger asChild>
                          <tr className="border-t cursor-pointer hover:bg-muted/50 transition-colors">
                            <td className="px-3 py-2 font-medium">
                              {tx.receipt_number}
                              {tx.status === "voided" && <span className="ml-[8px] rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-800 uppercase">Voided</span>}
                            </td>
                            <td className="px-3 py-2">{new Date(tx.created_at).toLocaleString()}</td>
                            <td className="px-3 py-2">{tx.payment_method || "cash"}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(Number(tx.total_due || 0))}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              <TooltipProvider>
                                <Tooltip>
                                  <DropdownMenu
                                    open={openMenuId?.id === tx.id && openMenuId.type === 'dropdown'} 
                                    onOpenChange={(o) => setOpenMenuId(o ? { id: tx.id, type: 'dropdown' } : null)}
                                  >
                                    <TooltipTrigger asChild>
                                      <DropdownMenuTrigger asChild>
                                        <div className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/80 cursor-pointer focus:outline-none">
                                          <MoreHorizontal className="h-4 w-4" />
                                          <span className="sr-only">More options</span>
                                        </div>
                                      </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Left-click ellipsis, or Right-click row for more options</p>
                                    </TooltipContent>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => openInvoiceA4Landscape(buildLogTemplateData(tx, "INTERNAL DUPLICATE"))}>
                                        View Invoice
                                      </DropdownMenuItem>
                                      {tx.status !== "voided" && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600 font-medium" 
                                            onClick={() => triggerVoidTransaction(tx)}
                                          >
                                            Void Transaction
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem onClick={() => openInvoiceA4Landscape(buildLogTemplateData(tx, "INTERNAL DUPLICATE"))}>
                            View Invoice
                          </ContextMenuItem>
                          {tx.status !== "voided" && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem 
                                className="text-red-600 focus:text-red-600 font-medium" 
                                onClick={() => triggerVoidTransaction(tx)}
                              >
                                Void Transaction
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {logTransactions.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Page {transactionPage} of {totalTransactionPages}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={transactionPage <= 1}
                    onClick={() => setTransactionPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={transactionPage >= totalTransactionPages}
                    onClick={() => setTransactionPage((prev) => Math.min(totalTransactionPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {voidTarget && (
              <Dialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Void Transaction: {voidTarget.receipt_number}</DialogTitle>
                    <DialogDescription className="space-y-4 pt-2 block">
                       <span className="block font-medium text-destructive">
                         Warning: Voiding this transaction will mark it as invalid and will restock any associated inventory products. This action cannot be reversed.
                       </span>
                       <span className="block space-y-2">
                         <span className="block text-sm font-semibold text-foreground">Reason for voiding:</span>
                         <Input 
                            value={voidReason} 
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="e.g. Test, Wrong Input, Customer Refund..." 
                            autoFocus
                         />
                       </span>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setVoidConfirmOpen(false)}>Cancel</Button>
                    <Button type="button" variant="destructive" onClick={confirmVoidTransaction}>
                       Confirm Void
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      <Dialog open={zConfirmOpen} onOpenChange={setZConfirmOpen}>
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
            <Button type="button" variant="outline" onClick={() => setZConfirmOpen(false)}>Cancel</Button>
            <Button type="button" variant="secondary" onClick={() => { setZConfirmOpen(false); generateXReading() }}>X-Reading (Preview)</Button>
            <Button type="button" onClick={generateZReading}>Finalize Day & Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
