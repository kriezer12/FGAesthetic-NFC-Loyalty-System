import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { LogTx } from "./types"

interface PosLogViewProps {
  logsLoading: boolean
  logTransactions: LogTx[]
  paginatedTransactions: LogTx[]
  onRefresh: () => void
  formatMoney: (value: number) => string
  onViewInvoice: (tx: LogTx) => void
  onTriggerVoid: (tx: LogTx) => void
  transactionPage: number
  totalTransactionPages: number
  onPageChange: (page: number) => void
}

export function PosLogView({
  logsLoading,
  logTransactions,
  paginatedTransactions,
  onRefresh,
  formatMoney,
  onViewInvoice,
  onTriggerVoid,
  transactionPage,
  totalTransactionPages,
  onPageChange,
}: PosLogViewProps) {
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg font-semibold">POS Logs</h2>
          <p className="text-sm text-muted-foreground">Internal transaction tracking for the current branch scope.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onRefresh} disabled={logsLoading}>
            {logsLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
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
                <ContextMenu key={tx.id}>
                  <ContextMenuTrigger asChild>
                    <tr className="border-t cursor-context-menu hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2 font-medium">
                        {tx.receipt_number}
                        {tx.status === "voided" && (
                          <span className="ml-[8px] rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-800 uppercase">
                            Voided
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{tx.payment_method || "cash"}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(Number(tx.total_due || 0))}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground text-xs italic">
                        Right-click row
                      </td>
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => onViewInvoice(tx)}>
                      View Invoice
                    </ContextMenuItem>
                    {tx.status !== "voided" && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          className="text-red-600 focus:text-red-600 font-medium" 
                          onClick={() => onTriggerVoid(tx)}
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
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Page {transactionPage} of {totalTransactionPages}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={transactionPage <= 1}
              onClick={() => onPageChange(Math.max(1, transactionPage - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={transactionPage >= totalTransactionPages}
              onClick={() => onPageChange(Math.min(totalTransactionPages, transactionPage + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
