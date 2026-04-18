import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { logUserAction } from "@/lib/user-log"

export interface StockTransfer {
    id: string
    product_id: string
    product?: {
        name: string
        sku: string
    }
    from_branch_id: string
    from_branch?: {
        id: string
        name: string
    }
    to_branch_id: string
    to_branch?: {
        id: string
        name: string
    }
    quantity: number
    status: 'pending' | 'in_transit' | 'received' | 'cancelled'
    initiated_by: string
    initiator?: {
        full_name: string
    }
    received_by: string | null
    receiver?: {
        full_name: string
    } | null
    reason: string | null
    initiated_at: string
    received_at: string | null
    cancelled_at: string | null
    cancellation_reason: string | null
    created_at: string
    updated_at: string
}

export function useStockTransfer() {
    const { userProfile } = useAuth()
    const [transfers, setTransfers] = useState<StockTransfer[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchTransfers = useCallback(async () => {
        if (!userProfile) return
        setLoading(true)
        try {
            const { data, error: err } = await supabase
                .from("inventory_transfers")
                .select(`
                    *, 
                    product:inventory_products(name, sku), 
                    from_branch:branches!from_branch_id(id, name), 
                    to_branch:branches!to_branch_id(id, name),
                    initiator:user_profiles!initiated_by(full_name),
                    receiver:user_profiles!received_by(full_name)
                `)
                .order("created_at", { ascending: false })
            
            if (err) throw err
            setTransfers(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch transfers")
        } finally {
            setLoading(false)
        }
    }, [userProfile])

    const initiateTransfer = async (params: {
        from_branch_id: string
        to_branch_id: string
        product_id: string
        quantity: number
        reason: string
    }) => {
        try {
            const response = await fetch("/api/inventory/transfers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify(params)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to create transfer")
            }

            const transfer = await response.json()

            // Log action
            await logUserAction({
                actionType: 'stock_transfer_create',
                entityType: 'stock_transfer',
                entityId: transfer.id,
                entityName: `${transfer.product?.name || 'Product'} (${transfer.quantity} units)`,
                metadata: {
                    from_branch: transfer.from_branch?.name,
                    to_branch: transfer.to_branch?.name,
                    quantity: transfer.quantity
                },
                changes: { after: transfer }
            })

            setTransfers(prev => [transfer, ...prev])
            return transfer
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to initiate transfer")
            throw err
        }
    }

    const approveTransfer = async (transferId: string) => {
        try {
            const response = await fetch(`/api/inventory/transfers/${transferId}/approve`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to approve transfer")
            }

            const transfer = await response.json()

            // Log action
            await logUserAction({
                actionType: 'stock_transfer_approve',
                entityType: 'stock_transfer',
                entityId: transfer.id,
                entityName: `${transfer.product?.name || 'Product'}`,
                metadata: { status: transfer.status },
                changes: { after: transfer }
            })

            setTransfers(prev => prev.map(t => t.id === transferId ? transfer : t))
            return transfer
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to approve transfer")
            throw err
        }
    }

    const receiveTransfer = async (transferId: string) => {
        try {
            const response = await fetch(`/api/inventory/transfers/${transferId}/receive`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to receive transfer")
            }

            const transfer = await response.json()

            // Log action
            await logUserAction({
                actionType: 'stock_transfer_receive',
                entityType: 'stock_transfer',
                entityId: transfer.id,
                entityName: `${transfer.product?.name || 'Product'}`,
                metadata: { status: transfer.status },
                changes: { after: transfer }
            })

            setTransfers(prev => prev.map(t => t.id === transferId ? transfer : t))
            return transfer
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to receive transfer")
            throw err
        }
    }

    const cancelTransfer = async (transferId: string, reason: string = "") => {
        try {
            const response = await fetch(`/api/inventory/transfers/${transferId}/cancel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({ reason })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to cancel transfer")
            }

            const transfer = await response.json()

            // Log action
            await logUserAction({
                actionType: 'stock_transfer_cancel',
                entityType: 'stock_transfer',
                entityId: transfer.id,
                entityName: `${transfer.product?.name || 'Product'}`,
                metadata: { reason },
                changes: { after: transfer }
            })

            setTransfers(prev => prev.map(t => t.id === transferId ? transfer : t))
            return transfer
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to cancel transfer")
            throw err
        }
    }

    return {
        transfers,
        loading,
        error,
        fetchTransfers,
        initiateTransfer,
        approveTransfer,
        receiveTransfer,
        cancelTransfer
    }
}
