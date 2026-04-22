import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, RefreshCw, Send, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NotificationToast } from "@/components/ui/notification-toast"
import { supabase } from "@/lib/supabase"
import { apiCall } from "@/lib/api"
import { openInvoiceA4Landscape, type ReceiptTemplateData } from "@/lib/receipt-templates"
import { useAuth } from "@/contexts/auth-context"

type Tx = {
  id: string
  appointment_id?: string | null
  customer_id?: string | null
  receipt_number: string
  receipt_sequence: number
  status: string
  payment_method?: string | null
  notes?: string | null
  subtotal: number
  discount_amount: number
  vatable_sales?: number | null
  vat_amount?: number | null
  vat_exempt_sales?: number | null
  total_due: number
  amount_paid: number
  change_amount: number
  created_at: string
  staff_id?: string | null
  branch_id?: string | null
}

type TxItem = {
  id: string
  transaction_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

type BusinessSettings = {
  business_name: string
  tin: string
  vat_reg_tin?: string | null
  ptu_no?: string | null
  date_issued?: string | null
  pos_serial_no?: string | null
  address?: string | null
  contact?: string | null
}

type BranchMap = Record<string, { name?: string | null; address?: string | null }>

type UserProfileMap = Record<string, { full_name?: string | null; email?: string | null }>

const formatMoney = (value: number) => `P${Number(value || 0).toFixed(2)}`
const walkInCustomerNotePrefix = "Walk-in Customer:"

const hashSeal = async (input: string) => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return `SEAL-${btoa(input).slice(0, 12)}`
  }
  const data = new TextEncoder().encode(input)
  const digest = await window.crypto.subtle.digest("SHA-256", data)
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
  return `SEAL-${hash.slice(0, 16).toUpperCase()}`
}

export default function SalesReportsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: string; title: string; message: string; type: "warning" | "success" } | null>(null)

  const [transactions, setTransactions] = useState<Tx[]>([])
  const [itemsByTx, setItemsByTx] = useState<Record<string, TxItem[]>>({})
  const [staffMap, setStaffMap] = useState<UserProfileMap>({})
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({})
  const [branchMap, setBranchMap] = useState<BranchMap>({})
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [pushTimestamp, setPushTimestamp] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [selectedTx, setSelectedTx] = useState<Tx | null>(null)
  const [verificationSeal, setVerificationSeal] = useState("")

  useEffect(() => {
    if (!userProfile || !["branch_admin", "super_admin"].includes(userProfile.role || "")) {
      navigate("/dashboard")
    }
  }, [userProfile, navigate])

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

  const fetchData = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Missing auth token")

      const txRes = await apiCall("/pos/transactions", { method: "GET", authToken: token })
      const txBody = await txRes.json()
      if (!txRes.ok) throw new Error(txBody?.error || "Failed to fetch transactions")

      const txRows = (txBody?.transactions || []) as Tx[]
      setTransactions(txRows)

      const ids = txRows.map((tx) => tx.id)
      if (ids.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("transaction_items")
          .select("id, transaction_id, description, quantity, unit_price, line_total")
          .in("transaction_id", ids)

        if (itemsError) throw itemsError

        const grouped: Record<string, TxItem[]> = {}
        for (const item of (itemsData || []) as TxItem[]) {
          if (!grouped[item.transaction_id]) grouped[item.transaction_id] = []
          grouped[item.transaction_id].push(item)
        }
        setItemsByTx(grouped)
      } else {
        setItemsByTx({})
      }

      const staffIds = Array.from(new Set(txRows.map((tx) => tx.staff_id).filter(Boolean))) as string[]
      if (staffIds.length > 0) {
        const { data: staffData, error: staffError } = await supabase
          .from("user_profiles")
          .select("id, full_name, email")
          .in("id", staffIds)

        if (staffError) throw staffError

        const map: UserProfileMap = {}
        for (const staff of staffData || []) {
          map[(staff as any).id] = { full_name: (staff as any).full_name, email: (staff as any).email }
        }
        setStaffMap(map)
      } else {
        setStaffMap({})
      }

      const customerIds = Array.from(new Set(txRows.map((tx) => tx.customer_id).filter(Boolean))) as string[]
      if (customerIds.length > 0) {
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id, name")
          .in("id", customerIds)

        if (customerError) throw customerError

        const map: Record<string, string> = {}
        for (const customer of customerData || []) {
          map[(customer as any).id] = (customer as any).name || "Walk-in"
        }
        setCustomerMap(map)
      } else {
        setCustomerMap({})
      }

      const branchIds = Array.from(new Set(txRows.map((tx) => tx.branch_id).filter(Boolean))) as string[]
      if (branchIds.length > 0) {
        const { data: branchData, error: branchError } = await supabase
          .from("branches")
          .select("id, name, address")
          .in("id", branchIds)

        if (branchError) throw branchError

        const map: BranchMap = {}
        for (const branch of branchData || []) {
          map[(branch as any).id] = { name: (branch as any).name, address: (branch as any).address }
        }
        setBranchMap(map)
      } else {
        setBranchMap({})
      }

      const { data: settingsData } = await supabase
        .from("business_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle()

      setSettings((settingsData || null) as BusinessSettings | null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load sales reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const parseWalkInCustomerName = useCallback((notes?: string | null) => {
    if (!notes) return ""
    const match = notes.match(new RegExp(`${walkInCustomerNotePrefix}\\s*(.*)`, "i"))
    return match?.[1]?.trim() || ""
  }, [])

  const resolveTxCustomerName = useCallback((tx: Tx) => {
    if (tx.customer_id) return customerMap[tx.customer_id] || "Walk-in"
    return parseWalkInCustomerName(tx.notes) || "Walk-in"
  }, [customerMap, parseWalkInCustomerName])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.trim().toLowerCase()
      const inSearch =
        !q ||
        tx.receipt_number?.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q) ||
        (staffMap[tx.staff_id || ""]?.full_name || "").toLowerCase().includes(q) ||
        resolveTxCustomerName(tx).toLowerCase().includes(q)

      if (!inSearch) return false

      const txDate = new Date(tx.created_at)
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (txDate < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (txDate > to) return false
      }

      return true
    })
  }, [transactions, search, dateFrom, dateTo, staffMap, resolveTxCustomerName])

  const grandTotalSales = useMemo(
    () => filteredTransactions.reduce((sum, tx) => sum + Number(tx.total_due || 0), 0),
    [filteredTransactions],
  )

  const sequenceCheck = useMemo(() => {
    const seq = [...filteredTransactions]
      .map((tx) => Number(tx.receipt_sequence))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)

    let gaps = 0
    for (let i = 1; i < seq.length; i += 1) {
      if (seq[i] !== seq[i - 1] + 1) gaps += 1
    }

    return { hasGap: gaps > 0, gapCount: gaps }
  }, [filteredTransactions])

  const activityLogCount = useMemo(() => filteredTransactions.length, [filteredTransactions])

  const openReceipt = async (tx: Tx) => {
    setSelectedTx(tx)
    const seal = await hashSeal(`${tx.id}|${tx.receipt_number}|${tx.total_due}|${tx.created_at}`)
    setVerificationSeal(seal)
  }

  const parsePaymentReference = (notes?: string | null) => {
    if (!notes) return ""
    const match = notes.match(/Payment Reference \([^)]*\):\s*(.*)/i)
    return match?.[1]?.trim() || ""
  }

  const buildTemplateData = (tx: Tx, modeLabel: ReceiptTemplateData["modeLabel"]): ReceiptTemplateData => {
    const computedVatAmount = typeof tx.vat_amount === "number" ? tx.vat_amount : Number((Number(tx.total_due || 0) - Number(tx.total_due || 0) / 1.12).toFixed(2))
    const totalDue = Number(tx.total_due || 0)
    const discountAmount = Number(tx.discount_amount || 0)
    const vatableSale = typeof tx.vatable_sales === "number" ? tx.vatable_sales : Number((totalDue / 1.12).toFixed(2))
    const vatExemptSale = typeof tx.vat_exempt_sales === "number" ? tx.vat_exempt_sales : discountAmount
    const paymentMethod = tx.payment_method || "cash"
    const paymentReference = parsePaymentReference(tx.notes)
    const branch = branchMap[tx.branch_id || ""]

    return {
      modeLabel,
      businessName: settings?.business_name || "FG Aesthetic Clinic",
      vatTin: settings?.vat_reg_tin || settings?.tin || undefined,
      branchAddress: branch?.address || settings?.address || undefined,
      ptuNo: settings?.ptu_no || undefined,
      dateIssued: settings?.date_issued || undefined,
      posSerialNo: settings?.pos_serial_no || undefined,
      transactionDate: new Date(tx.created_at).toLocaleString(),
      receiptNo: tx.receipt_number,
      customerName: resolveTxCustomerName(tx) || undefined,
      branchName: branch?.name || undefined,
      items: (itemsByTx[tx.id] || []).map((item) => ({
        description: item.description,
        quantity: Number(item.quantity || 0),
        lineTotal: Number(item.line_total || 0),
      })),
      subtotal: Number(tx.subtotal || 0),
      lessVat: computedVatAmount,
      salesNetOfVat: Number((totalDue - computedVatAmount).toFixed(2)),
      seniorPwdDiscount: 0,
      discountAmount,
      total: totalDue,
      amountPaid: Number(tx.amount_paid || 0),
      changeAmount: Number(tx.change_amount || 0),
      zeroRatedSale: 0,
      vatExemptSale,
      vatableSale,
      vatAmount: computedVatAmount,
      paymentMethod,
      paymentReference: paymentReference || undefined,
    }
  }

  const printInvoiceA4 = (tx: Tx) => {
    openInvoiceA4Landscape(buildTemplateData(tx, "INTERNAL DUPLICATE"))
  }

  const pushSalesData = async () => {
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      // Push functionality: generates a transmission payload and records push timestamp.
      const payload = {
        generated_at: new Date().toISOString(),
        count: filteredTransactions.length,
        grand_total_sales: grandTotalSales,
        transactions: filteredTransactions.map((tx) => ({
          transaction_ref: tx.receipt_number,
          total_due: tx.total_due,
          created_at: tx.created_at,
          payment_method: tx.payment_method,
        })),
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sales_push_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      setPushTimestamp(new Date().toLocaleString())
      setSuccessMessage("Internal transaction payload generated (export).")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Push transmission failed")
    }
  }

  if (!userProfile || !["branch_admin", "super_admin"].includes(userProfile.role || "")) {
    return null
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transaction Reports</h1>
          <p className="text-sm text-muted-foreground">Internal transaction archive and duplicate/internal invoice print controls.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchData()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={pushSalesData}>
            <Send className="mr-2 h-4 w-4" />
            Push Sales Data
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Accumulated Grand Total Sales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatMoney(grandTotalSales)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Sales Readings</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{filteredTransactions.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Sequential Series Check</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-sm font-semibold ${sequenceCheck.hasGap ? "text-destructive" : "text-green-600"}`}>
              {sequenceCheck.hasGap ? `Gap detected (${sequenceCheck.gapCount})` : "No gaps detected"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Activity / Transaction Log</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activityLogCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Internal Tracking Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 text-sm">
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Immutable transaction records + duplicate print trace</div>
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Supabase-backed transaction storage</div>
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Internal journal export payload generation</div>
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Branch-level totals and sequence checks</div>
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Internal copy print and A4 invoice output</div>
          <div className="rounded border p-2"><ShieldCheck className="inline mr-2 h-4 w-4 text-primary" />Per-transaction verification seal</div>
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Push/export functionality for internal reconciliation</div>
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Transaction data retention in database</div>
          <div className="rounded border p-2"><CheckCircle2 className="inline mr-2 h-4 w-4 text-green-600" />Last internal export: {pushTimestamp || "not yet executed"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction / Invoice Archive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transaction ref, cashier, transaction ID" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Transaction Ref</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Cashier</th>
                  <th className="px-3 py-2 text-left">Payment</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No transactions found.</td></tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{tx.receipt_number}</td>
                      <td className="px-3 py-2">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{resolveTxCustomerName(tx)}</td>
                      <td className="px-3 py-2">{staffMap[tx.staff_id || ""]?.full_name || "Unknown"}</td>
                      <td className="px-3 py-2">{tx.payment_method || "cash"}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(Number(tx.total_due || 0))}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => void openReceipt(tx)}>View</Button>
                          <Button variant="outline" size="sm" onClick={() => printInvoiceA4(tx)}>
                            Invoice A4
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedTx)} onOpenChange={(open) => { if (!open) setSelectedTx(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Preview</DialogTitle>
            <DialogDescription>
              Review transaction details and generate an internal A4 landscape invoice.
            </DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3 text-sm">
              <div className="rounded border p-3">
                <p className="text-base font-semibold">{settings?.business_name || "FG Aesthetic Centre"}</p>
                <p>TIN: {settings?.tin || "TIN NOT SET"}</p>
                <p>{settings?.address || "Address not configured"}</p>
                <p>{settings?.contact || "Contact not configured"}</p>
              </div>

              <div className="rounded border p-3">
                <p>Transaction Ref: <strong>{selectedTx.receipt_number}</strong></p>
                <p>Date: {new Date(selectedTx.created_at).toLocaleString()}</p>
                <p>Customer: {resolveTxCustomerName(selectedTx)}</p>
                <p>Cashier: {staffMap[selectedTx.staff_id || ""]?.full_name || "Unknown"}</p>
                <p>Payment: {selectedTx.payment_method || "cash"}</p>
                <p>Verification Seal: <strong>{verificationSeal || "Generating..."}</strong></p>
                <p className="mt-1 text-xs text-muted-foreground">Internal use only. Issue manual BIR-approved receipt separately.</p>
              </div>

              <div className="rounded border p-3">
                <p className="font-medium mb-2">Items</p>
                {(itemsByTx[selectedTx.id] || []).length === 0 ? (
                  <p className="text-muted-foreground">No line items found.</p>
                ) : (
                  <ul className="space-y-1">
                    {(itemsByTx[selectedTx.id] || []).map((item) => (
                      <li key={item.id} className="flex items-center justify-between">
                        <span>{item.description} x{item.quantity}</span>
                        <span>{formatMoney(Number(item.line_total || 0))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border p-3">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatMoney(Number(selectedTx.subtotal || 0))}</span></div>
                <div className="flex items-center justify-between"><span>Discount</span><span>{formatMoney(Number(selectedTx.discount_amount || 0))}</span></div>
                <div className="flex items-center justify-between font-semibold"><span>Total Due</span><span>{formatMoney(Number(selectedTx.total_due || 0))}</span></div>
                <div className="flex items-center justify-between"><span>Amount Paid</span><span>{formatMoney(Number(selectedTx.amount_paid || 0))}</span></div>
                <div className="flex items-center justify-between"><span>Change</span><span>{formatMoney(Number(selectedTx.change_amount || 0))}</span></div>
              </div>

              <div className="flex justify-end">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => printInvoiceA4(selectedTx)}>
                    Invoice A4
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
