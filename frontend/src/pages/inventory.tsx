import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Navigate } from "react-router-dom"
import { useInventory, Stock, Product } from "@/hooks/use-inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Package, 
  Plus, 
  Search, 
  RefreshCw, 
  History, 
  Layers, 
  AlertTriangle,
  ChevronDown,
  Settings2,
  Trash2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { ProductModal } from "@/components/features/inventory/product-modal"
import { StockAdjustmentModal } from "@/components/features/inventory/stock-adjustment-modal"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

export default function InventoryPage() {
  useEffect(() => {
    document.title = "Inventory - FG Aesthetic Centre"
  }, [])

  const { userProfile, loading: authLoading } = useAuth()
  const { 
    products, 
    stocks, 
    transactions, 
    loading: inventoryLoading, 
    error, 
    fetchProducts, 
    fetchStocks, 
    fetchTransactions,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock
  } = useInventory()

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("stocks")
  const [branches, setBranches] = useState<{id: string, name: string}[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  
  // Modal states
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  useEffect(() => {
    const fetchBranchesList = async () => {
      if (userProfile?.role === 'super_admin') {
        const { data } = await supabase.from('branches').select('id, name').order('name')
        setBranches(data || [])
      }
    }
    fetchBranchesList()
  }, [userProfile])

  const filteredStocks = useMemo(() => {
    let base = stocks
    if (selectedBranchId !== "all") {
      base = stocks.filter(s => s.branch_id === selectedBranchId)
    }
    
    if (!searchTerm) return base
    const term = searchTerm.toLowerCase()
    return base.filter((s) => 
      s.product?.name.toLowerCase().includes(term) || 
      s.product?.sku.toLowerCase().includes(term) ||
      s.product?.category?.toLowerCase().includes(term)
    )
  }, [stocks, searchTerm, selectedBranchId])

  const filteredTransactions = useMemo(() => {
    let base = transactions
    if (selectedBranchId !== "all") {
      base = transactions.filter(t => t.branch_id === selectedBranchId)
    }
    return base
  }, [transactions, selectedBranchId])

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    const term = searchTerm.toLowerCase()
    return products.filter((p) => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    )
  }, [products, searchTerm])

  const reorderCount = useMemo(() => {
    return filteredStocks.filter(s => s.quantity <= (s.product?.reorder_level || 0)).length
  }, [filteredStocks])

  const dangerCount = useMemo(() => {
    return filteredStocks.filter(s => s.quantity <= (s.product?.danger_level || 0)).length
  }, [filteredStocks])

  const branchProductCount = useMemo(() => {
    if (userProfile?.role === 'super_admin') {
      return products.length
    }
    return new Set(filteredStocks.map((s) => s.product_id)).size
  }, [userProfile, products.length, filteredStocks])

  const branchTransactionCount = useMemo(() => filteredTransactions.length, [filteredTransactions])

  const currentBranchName = userProfile?.role === 'super_admin'
    ? 'All Branches'
    : (userProfile?.branch_name || 'Main Branch')

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!userProfile || !["super_admin", "branch_admin", "staff"].includes(userProfile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  const isReadOnly = userProfile.role === 'staff'

  const handleAddProduct = () => {
    setEditingProduct(null)
    setProductModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductModalOpen(true)
  }

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete.id)
      setProductToDelete(null)
    }
  }

  const handleAdjustStock = (stock: Stock) => {
    setSelectedStock(stock)
    setStockModalOpen(true)
  }

  const handleSaveProduct = async (data: any) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data)
    } else {
      await createProduct(data)
    }
    fetchProducts()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">Manage products, track stock levels, and view transaction history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            fetchProducts()
            fetchStocks()
            fetchTransactions()
          }} disabled={inventoryLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${inventoryLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {!isReadOnly && (
            <Button size="sm" onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchProductCount}</div>
            {userProfile?.role !== 'super_admin' && (
              <div className="text-xs text-muted-foreground">Branch-specific product count</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items to Reorder</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${reorderCount > 0 ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reorderCount > 0 ? 'text-primary' : ''}`}>{reorderCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchTransactionCount}</div>
            {userProfile?.role !== 'super_admin' && (
              <div className="text-xs text-muted-foreground">Branch-specific transaction count</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Branch</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{currentBranchName}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="stocks" className="gap-2">
              <Layers className="h-4 w-4" />
              Stocks
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <History className="h-4 w-4" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-1 items-center justify-end gap-2 w-full md:w-auto">
            {userProfile.role === 'super_admin' && (
              <div className="relative">
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="stocks" className="space-y-4">
          {error && <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">{error}</div>}
          
          {reorderCount > 0 && (
            <div className="flex gap-4 p-4 rounded-lg bg-secondary/40 text-yellow-900 border border-yellow-200 mb-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-1">
                <h5 className="font-medium leading-none tracking-tight">Reorder Level Reached</h5>
                <div className="text-sm opacity-90">
                  <strong>{reorderCount}</strong> product(s) have reached their reorder level. 
                  {dangerCount > 0 && <span className="text-red-600 font-semibold ml-1">({dangerCount} at danger level!)</span>}
                  Please review and restock these items soon.
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto rounded-lg border">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                    <tr>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Unit Price</th>
                      {userProfile.role === 'super_admin' && selectedBranchId === 'all' && (
                        <th className="px-6 py-3">Branch</th>
                      )}
                      <th className="px-6 py-3 text-right">Quantity</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStocks.length === 0 ? (
                      <tr>
                        <td colSpan={userProfile.role === 'super_admin' && selectedBranchId === 'all' ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground">
                          No stock items found.
                        </td>
                      </tr>
                    ) : (
                      filteredStocks.map((stock) => (
                        <tr key={stock.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              {stock.product?.name}
                              {stock.quantity <= (stock.product?.danger_level || 0) ? (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              ) : stock.quantity <= (stock.product?.reorder_level || 0) ? (
                                <AlertTriangle className="h-4 w-4 text-primary" />
                              ) : null}
                            </div>
                          </td>
                          <td className="px-6 py-4">{stock.product?.sku}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary">{stock.product?.category || 'General'}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            {stock.product?.unit_price ? `₱${stock.product.unit_price.toLocaleString()}` : 'N/A'}
                          </td>
                          {userProfile.role === 'super_admin' && selectedBranchId === 'all' && (
                            <td className="px-6 py-4">
                              <Badge variant="info">
                                {stock.branch?.name || 'Unknown'}
                              </Badge>
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`font-bold ${
                                stock.quantity <= (stock.product?.danger_level || 0) ? 'text-red-600' :
                                stock.quantity <= (stock.product?.min_stock_level || 0) ? 'text-orange-600' :
                                stock.quantity <= (stock.product?.reorder_level || 0) ? 'text-primary' :
                                stock.quantity > (stock.product?.max_stock_level || Infinity) ? 'text-blue-600' : ''
                              }`}>
                                {stock.quantity}
                              </span>
                              {stock.product?.max_stock_level ? (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {Math.round((stock.quantity / stock.product.max_stock_level) * 100)}% left
                                </span>
                              ) : null}
                              {stock.quantity <= (stock.product?.reorder_level || 0) && (
                                <span className={`text-[10px] font-medium ${
                                  stock.quantity <= (stock.product?.danger_level || 0) ? 'text-red-600' : 'text-primary'
                                }`}>
                                  Reorder
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!isReadOnly && (
                              <Button size="sm" variant="outline" onClick={() => handleAdjustStock(stock)}>
                                Adjust
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Global Product Catalog</CardTitle>
              <CardDescription>All available products across all branches.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-lg border">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                    <tr>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Unit Price</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{p.name}</td>
                        <td className="px-6 py-4">{p.sku}</td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary">{p.category || 'N/A'}</Badge>
                        </td>
                        <td className="px-6 py-4">₱{p.unit_price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" disabled={isReadOnly} onClick={() => handleEditProduct(p)}>
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isReadOnly} onClick={() => handleDeleteClick(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent stock movements and adjustments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                      <tr>
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Movement</th>
                        <th className="px-4 py-3 text-right">Qty Change</th>
                        <th className="px-4 py-3 text-right">Resulting Qty</th>
                        <th className="px-4 py-3">Reason / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground whitespace-nowrap">
                            No stock movements recorded yet.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {format(new Date(t.created_at), 'MMM d, yyyy p')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium">{t.product?.name}</span>
                                <span className="text-[10px] text-muted-foreground">{t.branch?.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge 
                                variant={t.type === 'in' ? 'success' : t.type === 'out' ? 'destructive' : 'info'}
                                className="text-[10px] uppercase font-bold"
                              >
                                {t.type}
                              </Badge>
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${t.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {t.new_quantity ?? '—'}
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate" title={t.reason || ''}>
                              {t.reason || 'Manual Update'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProductModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      <StockAdjustmentModal
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
        stock={selectedStock}
        onAdjust={adjustStock}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{productToDelete?.name}</strong>. 
              All associated stock records and transaction history for this product will also be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-white hover:bg-destructive/90 transition-colors"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
