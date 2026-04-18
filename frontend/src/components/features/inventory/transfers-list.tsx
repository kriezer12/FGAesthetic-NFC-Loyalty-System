import { useState } from "react"
import { StockTransfer } from "@/hooks/use-stock-transfer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, Clock, ArrowRight, XCircle, Filter } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TransfersListProps {
  transfers: StockTransfer[]
  onApprove?: (transferId: string) => Promise<void>
  onReceive?: (transferId: string) => Promise<void>
  onCancel?: (transferId: string, reason: string) => Promise<void>
  loading?: boolean
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 transition-colors"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
    case "in_transit":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100 transition-colors"><ArrowRight className="w-3 h-3 mr-1" /> In Transit</Badge>
    case "received":
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 transition-colors"><CheckCircle className="w-3 h-3 mr-1" /> Received</Badge>
    case "cancelled":
      return <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 transition-colors"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export function TransfersList({
  transfers,
  onApprove,
  onReceive,
  onCancel,
  loading = false
}: TransfersListProps) {
  const { userProfile } = useAuth()
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'receive' | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8">
          <p className="text-center text-muted-foreground">No stock transfers found</p>
        </CardContent>
      </Card>
    )
  }

  const handleActionClick = (transfer: StockTransfer, action: 'approve' | 'receive' | 'cancel') => {
    setSelectedTransfer(transfer)
    if (action === 'cancel') {
      setCancelDialogOpen(true)
    } else {
      setConfirmAction(action)
      setConfirmDialogOpen(true)
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedTransfer || !confirmAction) return

    setActionLoading(true)
    try {
      if (confirmAction === 'approve' && onApprove) {
        await onApprove(selectedTransfer.id)
      } else if (confirmAction === 'receive' && onReceive) {
        await onReceive(selectedTransfer.id)
      }
      setConfirmDialogOpen(false)
      setSelectedTransfer(null)
      setConfirmAction(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!selectedTransfer || !onCancel) return

    setActionLoading(true)
    try {
      await onCancel(selectedTransfer.id, cancelReason)
      setCancelDialogOpen(false)
      setSelectedTransfer(null)
      setCancelReason("")
    } finally {
      setActionLoading(false)
    }
  }

  const canApprove = (transfer: StockTransfer) => {
    if (transfer.status === 'cancelled') return false
    if (userProfile?.role === 'super_admin') return transfer.status === 'pending'
    if (userProfile?.role === 'branch_admin' && userProfile?.branch_id === transfer.from_branch_id) {
      return transfer.status === 'pending'
    }
    return false
  }

  const canReceive = (transfer: StockTransfer) => {
    if (transfer.status === 'cancelled') return false
    if (userProfile?.role === 'super_admin') return transfer.status === 'pending' || transfer.status === 'in_transit'
    if (userProfile?.role === 'branch_admin' && userProfile?.branch_id === transfer.to_branch_id) {
      return transfer.status === 'pending' || transfer.status === 'in_transit'
    }
    return false
  }

  const canCancel = (transfer: StockTransfer) => {
    if (transfer.status === 'received' || transfer.status === 'cancelled') return false
    if (userProfile?.role === 'super_admin') return true
    if (userProfile?.role === 'branch_admin' && userProfile?.branch_id === transfer.from_branch_id) {
      return true
    }
    return false
  }

  const filteredTransfers = transfers.filter(
    (transfer) => statusFilter === "all" || transfer.status === statusFilter
  )

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="flex items-center text-sm font-medium text-muted-foreground">
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transfers</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No stock transfers match the selected filter
                </TableCell>
              </TableRow>
            ) : (
              filteredTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                  <TableCell className="font-medium">
                    {transfer.product?.name}
                    {transfer.reason && (
                      <p className="text-xs text-muted-foreground mt-1">{transfer.reason}</p>
                    )}
                  </TableCell>
                  <TableCell>{transfer.from_branch?.name}</TableCell>
                  <TableCell>{transfer.to_branch?.name}</TableCell>
                  <TableCell className="text-right font-medium">{transfer.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(transfer.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canApprove(transfer) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActionClick(transfer, 'approve')}
                          disabled={actionLoading || loading}
                        >
                          Approve
                        </Button>
                      )}
                      {canReceive(transfer) && (
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(transfer, 'receive')}
                          disabled={actionLoading || loading}
                        >
                          Receive
                        </Button>
                      )}
                      {canCancel(transfer) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleActionClick(transfer, 'cancel')}
                          disabled={actionLoading || loading}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Action Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Approve Transfer' : 'Receive Transfer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve'
                ? `Are you sure you want to mark "${selectedTransfer?.product?.name}" transfer as approved (in transit)?`
                : `Are you sure you want to receive ${selectedTransfer?.quantity} units of "${selectedTransfer?.product?.name}"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Reason Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Transfer</DialogTitle>
            <DialogDescription>
              Cancel transfer of {selectedTransfer?.quantity} units of "{selectedTransfer?.product?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cancel_reason">Reason for Cancellation</Label>
              <Input
                id="cancel_reason"
                placeholder="Enter reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={actionLoading}
            >
              Keep Transfer
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={actionLoading}
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
