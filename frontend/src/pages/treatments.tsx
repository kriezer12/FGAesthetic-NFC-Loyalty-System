import { useState, useEffect } from "react"
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { generateId } from "@/components/features/calendar/calendar-parts/calendar-utils"
import type { ServiceCategory, Service } from "@/types/service"
export default function TreatmentsPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [svcModalOpen, setSvcModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  const fetchCategories = async () => {
    const { data } = await supabase.from("service_categories").select("*")
    setCategories((data || []) as ServiceCategory[])
  }
  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*")
    setServices((data || []) as Service[])
  }

  useEffect(() => {
    fetchCategories()
    fetchServices()
  }, [])

  const saveCategory = async (cat: ServiceCategory) => {
    if (cat.id) {
      await supabase.from("service_categories").update({ name: cat.name }).eq("id", cat.id)
    } else {
      const id = generateId()
      await supabase.from("service_categories").insert({ id, name: cat.name })
    }
    fetchCategories()
  }
  const deleteCategory = async (id: string) => {
    await supabase.from("service_categories").delete().eq("id", id)
    fetchCategories()
    setServices((prev) => prev.filter((s) => s.category_id !== id))
  }

  const saveService = async (svc: Service) => {
    if (svc.id) {
      await supabase.from("services").update(svc).eq("id", svc.id)
    } else {
      const id = generateId()
      await supabase.from("services").insert({ ...svc, id })
    }
    fetchServices()
  }
  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id)
    fetchServices()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Service Catalog</h1>
      <div className="mb-4">
        <Button onClick={() => { setEditingCategory(null); setCatModalOpen(true) }}>
          + Create Category
        </Button>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => {
          const catServices = services.filter((s) => s.category_id === cat.id)
          return (
            <Card key={cat.id} className="py-0 gap-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 py-4">
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => { setSelectedCategoryId(cat.id); setEditingService(null); setSvcModalOpen(true) }}>
                    <Plus className="size-4 mr-1" />Service
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingCategory(cat); setCatModalOpen(true) }}>
                        <Pencil className="size-4 mr-2" />Edit Category
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => deleteCategory(cat.id)}>
                        <Trash2 className="size-4 mr-2" />Delete Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {catServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-4">No services yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Equipment</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Package</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catServices.map((s) => (
                        <ContextMenu key={s.id}>
                          <ContextMenuTrigger asChild>
                            <TableRow className="cursor-context-menu">
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell className="text-muted-foreground">{s.equipment || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{s.product || "—"}</TableCell>
                              <TableCell className="text-center">
                                {s.is_package ? (
                                  [s.session_count ? `${s.session_count}×` : null, s.recurrence_days ? `every ${s.recurrence_days}d` : "weekly"].filter(Boolean).join(" ") || "Yes"
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-right">₱{s.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="size-8" onClick={() => { setEditingService(s); setSvcModalOpen(true) }}>
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => deleteService(s.id)}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => { setEditingService(s); setSvcModalOpen(true) }}>
                              <Pencil className="size-4 mr-2" />Edit Service
                            </ContextMenuItem>
                            <ContextMenuItem variant="destructive" onClick={() => deleteService(s.id)}>
                              <Trash2 className="size-4 mr-2" />Delete Service
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Category modal */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              value={editingCategory?.name || ""}
              onChange={(e) => setEditingCategory((ec) => ({ id: ec?.id || "", name: e.target.value }))}
              placeholder="Category name"
            />
            <Button onClick={() => {
              if (editingCategory && editingCategory.name.trim()) {
                saveCategory(editingCategory)
                setCatModalOpen(false)
              }
            }}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service modal */}
      <Dialog open={svcModalOpen} onOpenChange={setSvcModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Service Name</Label>
              <Input
                value={editingService?.name || ""}
                onChange={(e) => setEditingService((es) => ({
                  id: es?.id || "",
                  category_id: es?.category_id || selectedCategoryId,
                  name: e.target.value,
                  uses_equipment: es?.uses_equipment || false,
                  equipment: es?.equipment,
                  uses_product: es?.uses_product || false,
                  product: es?.product,
                  price: es?.price || 0,
                  is_package: es?.is_package || false,
                  session_count: es?.session_count || undefined,
                  recurrence_days: es?.recurrence_days || undefined,
                }))}
                placeholder="e.g. Deep Cleansing Facial"
              />
            </div>

            {/* Equipment checkbox + placeholder dropdown */}
            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uses-equipment"
                  checked={editingService?.uses_equipment || false}
                  onCheckedChange={(v) => setEditingService((es) => ({
                    ...es!,
                    uses_equipment: !!v,
                    ...(!v && { equipment: undefined }),
                  }))}
                />
                <Label htmlFor="uses-equipment">Uses Equipment</Label>
              </div>
              {editingService?.uses_equipment && (
                <Combobox
                  options={[]}
                  value={editingService?.equipment || ""}
                  onValueChange={(v) => setEditingService((es) => ({ ...es!, equipment: v }))}
                  placeholder="Select equipment…"
                  emptyMessage="No equipment available yet"
                />
              )}
            </div>

            {/* Product checkbox + placeholder dropdown */}
            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uses-product"
                  checked={editingService?.uses_product || false}
                  onCheckedChange={(v) => setEditingService((es) => ({
                    ...es!,
                    uses_product: !!v,
                    ...(!v && { product: undefined }),
                  }))}
                />
                <Label htmlFor="uses-product">Uses Product</Label>
              </div>
              {editingService?.uses_product && (
                <Combobox
                  options={[]}
                  value={editingService?.product || ""}
                  onValueChange={(v) => setEditingService((es) => ({ ...es!, product: v }))}
                  placeholder="Select product…"
                  emptyMessage="No products available yet"
                />
              )}
            </div>

            {/* Price */}
            <div className="grid gap-1">
              <Label>Price (₱)</Label>
              <Input
                type="number"
                min={0}
                value={editingService?.price ?? 0}
                onChange={(e) => setEditingService((es) => ({ ...es!, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>


            {/* Package flag + recurrence */}
            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-package"
                  checked={editingService?.is_package || false}
                  onCheckedChange={(v) => setEditingService((es) => ({
                    ...es!,
                    is_package: !!v,
                    ...(!v && { session_count: undefined, recurrence_days: undefined }),
                  }))}
                />
                <Label htmlFor="is-package">Package / Multi-session</Label>
              </div>
              {editingService?.is_package && (
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label>Number of sessions</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingService?.session_count ?? ""}
                      onChange={(e) => setEditingService((es) => ({ ...es!, session_count: parseInt(e.target.value, 10) || undefined }))}
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Days between sessions</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingService?.recurrence_days ?? ""}
                      onChange={(e) => setEditingService((es) => ({ ...es!, recurrence_days: parseInt(e.target.value, 10) || undefined }))}
                      placeholder="7 (weekly)"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => {
              if (editingService && editingService.name.trim()) {
                saveService(editingService)
                setSvcModalOpen(false)
              }
            }}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
