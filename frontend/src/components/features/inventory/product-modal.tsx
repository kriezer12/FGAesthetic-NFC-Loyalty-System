import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { Product } from "@/hooks/use-inventory"

interface ProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSave: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
}

export function ProductModal({ open, onOpenChange, product, onSave }: ProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category: "",
    unit_price: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    reorder_level: 0,
    danger_level: 0,
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        category: product.category || "",
        unit_price: product.unit_price,
        min_stock_level: product.min_stock_level || 0,
        max_stock_level: product.max_stock_level || 0,
        reorder_level: product.reorder_level || 0,
        danger_level: product.danger_level || 0,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        unit_price: 0,
        min_stock_level: 0,
        max_stock_level: 0,
        reorder_level: 0,
        danger_level: 0,
      })
    }
  }, [product, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save product:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {product ? "Update product details." : "Create a new product in the catalog."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU / Code</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit_price">Unit Price (₱)</Label>
              <Input
                id="unit_price"
                type="number"
                value={formData.unit_price ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, unit_price: val === "" ? "" : (parseFloat(val) || 0) } as any)
                }}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="max_stock_level">Maximum Level</Label>
                  <Tooltip>
                    <TooltipTrigger type="button" className="cursor-help outline-none">
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] font-normal leading-relaxed text-sm">
                      <p>Also known as carrying cost or stock ceiling, it is the upper limit for the quantity of stock that a business wants to hold at any given point. Going above this level ties up capital and storage space, resulting in overstocking.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="max_stock_level"
                  type="number"
                  min="0"
                  value={formData.max_stock_level ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, max_stock_level: val === "" ? "" : (parseInt(val) || 0) } as any)
                  }}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="min_stock_level">Minimum Level</Label>
                  <Tooltip>
                    <TooltipTrigger type="button" className="cursor-help outline-none">
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] font-normal leading-relaxed text-sm">
                      <p>It represents the lower limit of stock quantity that should be available with the firm before a new order is placed. Falling below this level may lead to stockouts.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="min_stock_level"
                  type="number"
                  min="0"
                  value={formData.min_stock_level ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, min_stock_level: val === "" ? "" : (parseInt(val) || 0) } as any)
                  }}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Tooltip>
                    <TooltipTrigger type="button" className="cursor-help outline-none">
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] font-normal leading-relaxed text-sm">
                      <p>It is the inventory level at which a new order should be placed to replenish stock before it runs out, taking into account lead time, safety stock and usage rate.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="reorder_level"
                  type="number"
                  min="0"
                  value={formData.reorder_level ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, reorder_level: val === "" ? "" : (parseInt(val) || 0) } as any)
                  }}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="danger_level">Danger Level</Label>
                  <Tooltip>
                    <TooltipTrigger type="button" className="cursor-help outline-none">
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] font-normal leading-relaxed text-sm">
                      <p>Such a situation is often considered problematic for organizations since, at this point, the inventory falls beyond the minimum level, threatening the temporary halt of production. This stage requires immediate restocking of goods.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="danger_level"
                  type="number"
                  min="0"
                  value={formData.danger_level ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, danger_level: val === "" ? "" : (parseInt(val) || 0) } as any)
                  }}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
