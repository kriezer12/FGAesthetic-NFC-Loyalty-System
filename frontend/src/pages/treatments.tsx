import { useState, useEffect, useMemo } from "react"
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

const ROOT_SCOPE = "__root__"

const getScopeKey = (categoryId: string | null | undefined) => categoryId || ROOT_SCOPE

const reorderById = (ids: string[], activeId: string, overId: string) => {
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  if (from < 0 || to < 0 || from === to) return ids

  const next = [...ids]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const getSortOrder = (sortOrder?: number | null) => sortOrder ?? Number.MAX_SAFE_INTEGER

const compareBySortOrder = (a?: number | null, b?: number | null) => getSortOrder(a) - getSortOrder(b)

export default function TreatmentsPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [svcModalOpen, setSvcModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null)
  const [draggingService, setDraggingService] = useState<{ id: string; scope: string } | null>(null)
  const [dragOverServiceId, setDragOverServiceId] = useState<string | null>(null)

  const createEmptyService = (categoryId: string | null): Service => ({
    id: "",
    category_id: categoryId,
    sort_order: null,
    name: "",
    uses_equipment: false,
    uses_product: false,
    price: 0,
    is_package: false,
  })

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })

    if (error) {
      const { data: fallback } = await supabase.from("service_categories").select("*")
      setCategories((fallback || []) as ServiceCategory[])
      return
    }

    setCategories((data || []) as ServiceCategory[])
  }

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })

    if (error) {
      const { data: fallback } = await supabase.from("services").select("*")
      setServices((fallback || []) as Service[])
      return
    }

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
      const nextSortOrder = categories.reduce((max, current) => Math.max(max, current.sort_order ?? -1), -1) + 1
      await supabase.from("service_categories").insert({ id, name: cat.name, sort_order: nextSortOrder })
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
      const scopeServices = services.filter((s) => getScopeKey(s.category_id) === getScopeKey(svc.category_id))
      const nextSortOrder = scopeServices.reduce((max, current) => Math.max(max, current.sort_order ?? -1), -1) + 1
      await supabase.from("services").insert({ ...svc, id, sort_order: nextSortOrder })
    }
    fetchServices()
  }

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id)
    fetchServices()
  }

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => compareBySortOrder(a.sort_order, b.sort_order))
  }, [categories])

  const sortServicesForScope = (scope: string, scopedServices: Service[]) => {
    return [...scopedServices]
      .filter((s) => getScopeKey(s.category_id) === scope)
      .sort((a, b) => compareBySortOrder(a.sort_order, b.sort_order))
  }

  const uncategorizedServices = useMemo(
    () => sortServicesForScope(ROOT_SCOPE, services.filter((s) => !s.category_id)),
    [services],
  )

  const persistCategoryOrder = async (orderedIds: string[]) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from("service_categories").update({ sort_order: index }).eq("id", id),
      ),
    )
  }

  const persistServiceOrder = async (orderedIds: string[]) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from("services").update({ sort_order: index }).eq("id", id),
      ),
    )
  }

  const handleCategoryDrop = (targetCategoryId: string) => {
    if (!draggingCategoryId || draggingCategoryId === targetCategoryId) return

    const orderedIds = reorderById(
      sortedCategories.map((category) => category.id),
      draggingCategoryId,
      targetCategoryId,
    )

    setCategories((prev) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
      return prev.map((category) => ({
        ...category,
        sort_order: orderMap.get(category.id) ?? category.sort_order ?? null,
      }))
    })
    void persistCategoryOrder(orderedIds)
    setDraggingCategoryId(null)
    setDragOverCategoryId(null)
  }

  const handleServiceDrop = (scope: string, targetServiceId: string) => {
    if (!draggingService || draggingService.scope !== scope || draggingService.id === targetServiceId) return

    const scopedServices = sortServicesForScope(
      scope,
      services.filter((service) => getScopeKey(service.category_id) === scope),
    )

    const orderedIds = reorderById(
      scopedServices.map((service) => service.id),
      draggingService.id,
      targetServiceId,
    )

    setServices((prev) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
      return prev.map((service) => {
        if (getScopeKey(service.category_id) !== scope) return service
        return {
          ...service,
          sort_order: orderMap.get(service.id) ?? service.sort_order ?? null,
        }
      })
    })
    void persistServiceOrder(orderedIds)
    setDraggingService(null)
    setDragOverServiceId(null)
  }

  const renderServiceRows = (scopedServices: Service[], scope: string) => (
    scopedServices.map((s) => (
      <ContextMenu key={s.id}>
        <ContextMenuTrigger asChild>
          <TableRow
            className={`cursor-context-menu ${dragOverServiceId === s.id ? "bg-accent/40" : ""}`}
            draggable
            onDragStart={(e) => {
              e.stopPropagation()
              setDraggingService({ id: s.id, scope })
            }}
            onDragEnd={() => {
              setDraggingService(null)
              setDragOverServiceId(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (draggingService?.scope === scope && draggingService.id !== s.id) {
                setDragOverServiceId(s.id)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleServiceDrop(scope, s.id)
            }}
          >
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell className="text-muted-foreground">{s.equipment || "—"}</TableCell>
            <TableCell className="text-muted-foreground">{s.product || "—"}</TableCell>
            <TableCell className="text-center">
              {s.is_package
                ? ([
                  s.session_count ? `${s.session_count}×` : null,
                  s.recurrence_days ? `every ${s.recurrence_days}d` : "weekly",
                ].filter(Boolean).join(" ") || "Yes")
                : "—"}
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
    ))
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Service Catalog</h1>
      <div className="mb-4 flex items-center gap-2">
        <Button onClick={() => { setEditingCategory(null); setCatModalOpen(true) }}>
          + Create Category
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedCategoryId(null)
            setEditingService(createEmptyService(null))
            setSvcModalOpen(true)
          }}
        >
          <Plus className="size-4 mr-1" />Add Service
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 py-4">
            <CardTitle className="text-lg">Uncategorized Services</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {uncategorizedServices.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-4">No services in root yet.</p>
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
                <TableBody>{renderServiceRows(uncategorizedServices, ROOT_SCOPE)}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {sortedCategories.map((cat) => {
          const catServices = sortServicesForScope(cat.id, services.filter((s) => s.category_id === cat.id))
          return (
            <Card
              key={cat.id}
              className={`py-0 gap-0 transition ${dragOverCategoryId === cat.id ? "ring-2 ring-primary/60" : ""}`}
              draggable
              onDragStart={() => setDraggingCategoryId(cat.id)}
              onDragEnd={() => {
                setDraggingCategoryId(null)
                setDragOverCategoryId(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (draggingCategoryId && draggingCategoryId !== cat.id) {
                  setDragOverCategoryId(cat.id)
                }
              }}
              onDrop={() => handleCategoryDrop(cat.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 py-4">
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => { setSelectedCategoryId(cat.id); setEditingService(createEmptyService(cat.id)); setSvcModalOpen(true) }}>
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
                    <TableBody>{renderServiceRows(catServices, cat.id)}</TableBody>
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
                  category_id: es?.category_id ?? selectedCategoryId,
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
