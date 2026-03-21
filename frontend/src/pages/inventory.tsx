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
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
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
import { SelectNative } from "@/components/ui/select-native"
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

  const lowStockCount = useMemo(() => {
    return filteredStocks.filter(s => s.quantity <= s.min_stock_level).length
  }, [filteredStocks])

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
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-destructive' : ''}`}>{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Branch</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {userProfile.role === 'super_admin' ? 'All Branches' : (userProfile.branch_name || 'Main Branch')}
            </div>
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
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <SelectNative 
                  className="max-w-[200px] pr-8"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </SelectNative>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStocks.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No stock items found.
              </div>
            ) : (
              filteredStocks.map((stock) => (
                <Card key={stock.id} className="overflow-hidden group hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex gap-2 mb-2">
                          <Badge variant="outline">{stock.product?.category || 'General'}</Badge>
                          {userProfile.role === 'super_admin' && selectedBranchId === 'all' && (
                            <Badge variant="info">
                              {stock.branch?.name || 'Unknown'}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{stock.product?.name}</CardTitle>
                        <CardDescription>{stock.product?.sku}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${stock.quantity <= stock.min_stock_level ? 'text-destructive' : ''}`}>
                          {stock.quantity}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">Quantity</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Min level: {stock.min_stock_level}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Last updated: {format(new Date(stock.updated_at), 'MMM d, h:mm a')}
                        </div>
                      </div>
                      {!isReadOnly && (
                        <Button size="sm" variant="secondary" className="gap-1" onClick={() => handleAdjustStock(stock)}>
                          Adjust
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  {stock.quantity <= stock.min_stock_level && (
                    <div className="bg-destructive/10 px-4 py-1 text-[10px] text-destructive font-semibold text-center uppercase tracking-wider">
                      Low Stock Warning
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
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
              <div className="space-y-4">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        t.type === 'in' ? 'bg-emerald-500/10 text-emerald-600' : 
                        t.type === 'out' ? 'bg-destructive/10 text-destructive' : 
                        'bg-sky-500/10 text-sky-600'
                      }`}>
                        {t.type === 'in' ? <ArrowDownLeft className="h-4 w-4" /> : 
                         t.type === 'out' ? <ArrowUpRight className="h-4 w-4" /> : 
                         <Layers className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{t.product?.name}</div>
                          {userProfile.role === 'super_admin' && selectedBranchId === 'all' && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {t.branch?.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground italic">{t.reason || 'No reason provided'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${t.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {format(new Date(t.created_at), 'MMM d, p')}
                      </div>
                    </div>
                  </div>
                ))}
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
