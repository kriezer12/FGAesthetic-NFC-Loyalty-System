import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export interface Product {
    id: string
    name: string
    description: string | null
    sku: string
    category: string | null
    unit_price: number
    min_stock_level: number
    max_stock_level: number
    reorder_level: number
    danger_level: number
    created_at: string
    updated_at: string
}

export interface Stock {
    id: string
    product_id: string
    branch_id: string
    quantity: number
    min_stock_level: number
    updated_at: string
    product?: Product
    branch?: { name: string }
}

export interface Transaction {
    id: string
    product_id: string
    branch_id: string
    type: 'in' | 'out' | 'adjustment' | 'transfer'
    quantity: number
    previous_quantity: number
    new_quantity: number
    reason: string | null
    performed_by: string | null
    created_at: string
    product?: Product
    branch?: { name: string }
}

export function useInventory() {
    const { userProfile } = useAuth()
    const [products, setProducts] = useState<Product[]>([])
    const [stocks, setStocks] = useState<Stock[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("inventory_products")
                .select("*")
                .order("name")
            
            if (error) throw error
            setProducts(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch products")
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchStocks = useCallback(async () => {
        if (!userProfile) return
        setLoading(true)
        try {
            let query = supabase
                .from("inventory_stocks")
                .select("*, product:inventory_products(*), branch:branches(name)")
            
            if (userProfile.role !== 'super_admin') {
                query = query.eq('branch_id', userProfile.branch_id)
            }

            const { data, error } = await query
            if (error) throw error
            setStocks(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch stocks")
        } finally {
            setLoading(false)
        }
    }, [userProfile])

    const fetchTransactions = useCallback(async () => {
        if (!userProfile) return
        setLoading(true)
        try {
            let query = supabase
                .from("inventory_transactions")
                .select("*, product:inventory_products(*), branch:branches(name)")
                .order("created_at", { ascending: false })
            
            if (userProfile.role !== 'super_admin') {
                query = query.eq('branch_id', userProfile.branch_id)
            }

            const { data, error } = await query.limit(50)
            if (error) throw error
            setTransactions(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch transactions")
        } finally {
            setLoading(false)
        }
    }, [userProfile])

    const createProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await supabase
                .from("inventory_products")
                .insert(product)
                .select()
                .single()
            
            if (error) throw error
            setProducts(prev => [...prev, data])
            return data
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create product")
            throw err
        }
    }

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        try {
            const { data, error } = await supabase
                .from("inventory_products")
                .update(updates)
                .eq("id", id)
                .select()
                .single()
            
            if (error) throw error
            setProducts(prev => prev.map(p => p.id === id ? data : p))
            return data
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update product")
            throw err
        }
    }

    const adjustStock = async (params: {
        productId: string
        branchId: string
        quantity: number // The relative change
        type: Transaction['type']
        reason: string
    }) => {
        try {
            // 1. Get current stock
            const { data: currentStock, error: stockFetchError } = await supabase
                .from("inventory_stocks")
                .select("*")
                .eq("product_id", params.productId)
                .eq("branch_id", params.branchId)
                .maybeSingle()
            
            if (stockFetchError) throw stockFetchError

            const newQuantity = (currentStock?.quantity || 0) + params.quantity

            // 2. Upsert stock
            const { error: stockError } = await supabase
                .from("inventory_stocks")
                .upsert({
                    product_id: params.productId,
                    branch_id: params.branchId,
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'product_id,branch_id' })
            
            if (stockError) throw stockError

            // 3. Log transaction (Audit Log)
            const { error: transError } = await supabase
                .from("inventory_transactions")
                .insert({
                    product_id: params.productId,
                    branch_id: params.branchId,
                    type: params.type,
                    quantity: params.quantity,
                    previous_quantity: currentStock?.quantity || 0,
                    new_quantity: newQuantity,
                    reason: params.reason,
                    performed_by: userProfile?.id
                })
            
            if (transError) throw transError

            // Refresh stocks and transactions
            fetchStocks()
            fetchTransactions()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to adjust stock")
            throw err
        }
    }

    const deleteProduct = async (id: string) => {
        try {
            const { error } = await supabase
                .from("inventory_products")
                .delete()
                .eq("id", id)
            
            if (error) throw error
            
            setProducts(prev => prev.filter(p => p.id !== id))
            // Stocks will be deleted by CASCADE in DB, but we refresh local state too
            fetchStocks()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete product")
            throw err
        }
    }

    useEffect(() => {
        if (userProfile) {
            fetchProducts()
            fetchStocks()
            fetchTransactions()
        }
    }, [userProfile, fetchProducts, fetchStocks, fetchTransactions])

    return {
        products,
        stocks,
        transactions,
        loading,
        error,
        fetchProducts,
        fetchStocks,
        fetchTransactions,
        createProduct,
        updateProduct,
        deleteProduct,
        adjustStock
    }
}
