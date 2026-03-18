/**
 * Service Picker
 * ==============
 *
 * A multi-select service picker for the appointment form.
 * Shows service categories → services in a two-step flow.
 * Users pick a category, then toggle individual services,
 * and confirm their selection.
 */

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import type { ServiceCategory, Service } from "@/types/service"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ServicePickerProps {
  /** Currently confirmed service IDs */
  value: string[]
  /** Called when user confirms selection */
  onChange: (serviceIds: string[]) => void
  disabled?: boolean
  /** Show selected badges under the input (default: true) */
  showSelectedBadges?: boolean
  /** Use a compact single-row preview that doesn't expand form height (default: false) */
  compactSelectedPreview?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ServicePicker({
  value,
  onChange,
  disabled,
  showSelectedBadges = true,
  compactSelectedPreview = false,
}: ServicePickerProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  // Pending selection (uncommitted) — initialised from `value` on open
  const [pending, setPending] = useState<string[]>([])

  // ---- fetch data ----
  useEffect(() => {
    const load = async () => {
      const [catRes, svcRes] = await Promise.all([
        supabase.from("service_categories").select("*"),
        supabase.from("services").select("*"),
      ])
      setCategories((catRes.data || []) as ServiceCategory[])
      setServices((svcRes.data || []) as Service[])
    }
    load()
  }, [])

  // Reset pending state each time the popover opens
  useEffect(() => {
    if (open) {
      setPending([...value])
      setActiveCategoryId(null)
    }
  }, [open, value])

  // ---- derived ----
  const serviceMap = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  )

  const categoryServices = useMemo(
    () => (activeCategoryId ? services.filter((s) => s.category_id === activeCategoryId) : []),
    [services, activeCategoryId],
  )

  const selectedLabels = useMemo(
    () => value.map((id) => serviceMap.get(id)?.name).filter(Boolean) as string[],
    [value, serviceMap],
  )

  // ---- handlers ----
  const toggleService = (id: string) => {
    setPending((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  const confirm = () => {
    onChange(pending)
    setOpen(false)
  }

  const removeService = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="grid gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {value.length > 0
                ? `${value.length} service${value.length > 1 ? "s" : ""} selected`
                : "Select services…"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[360px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden"
          align="start"
        >
          {/* ------- category list (step 1) ------- */}
          {activeCategoryId === null ? (
            <div className="flex flex-col">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                Select a category
              </div>
              <ScrollArea className="h-72">
                {categories.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No categories available.
                  </p>
                ) : (
                  categories.map((cat) => {
                    const count = services.filter((s) => s.category_id === cat.id).length
                    const selectedCount = pending.filter((id) => {
                      const svc = serviceMap.get(id)
                      return svc?.category_id === cat.id
                    }).length
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryId(cat.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {cat.name}
                          {selectedCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {selectedCount}
                            </Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-xs">{count}</span>
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </button>
                    )
                  })
                )}
              </ScrollArea>

              {/* Confirm bar */}
              <div className="border-t px-3 py-2 flex items-center justify-between shrink-0 bg-popover">
                <span className="text-xs text-muted-foreground">
                  {pending.length} selected
                </span>
                <Button size="sm" onClick={confirm}>
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            /* ------- services in category (step 2) ------- */
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setActiveCategoryId(null)}
                className="flex w-full items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {categories.find((c) => c.id === activeCategoryId)?.name ?? "Back"}
              </button>

              <ScrollArea className="h-72">
                {categoryServices.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No services in this category.
                  </p>
                ) : (
                  categoryServices.map((svc) => {
                    const isSelected = pending.includes(svc.id)
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors",
                          isSelected ? "bg-accent" : "hover:bg-accent/50",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input",
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="flex items-center gap-1">
                            {svc.name}
                            {svc.is_package && (
                              <Badge variant="outline" className="text-[10px]">
                                pkg{svc.recurrence_days ? `/${svc.recurrence_days}d` : ""}
                              </Badge>
                            )}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ₱{svc.price.toFixed(2)}
                        </span>
                      </button>
                    )
                  })
                )}
              </ScrollArea>

              {/* Confirm bar */}
              <div className="border-t px-3 py-2 flex items-center justify-between shrink-0 bg-popover">
                <span className="text-xs text-muted-foreground">
                  {pending.length} selected
                </span>
                <Button size="sm" onClick={confirm}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected service badges */}
      {showSelectedBadges && selectedLabels.length > 0 && (
        compactSelectedPreview ? (
          <div className="rounded-md border bg-muted/20 px-2 py-1.5">
            <ScrollArea className="h-20 w-full">
              <div className="flex flex-wrap gap-1.5 pr-2">
                {value.map((id) => {
                  const svc = serviceMap.get(id)
                  if (!svc) return null
                  return (
                    <Badge key={id} variant="secondary" className="max-w-[240px] gap-1 pr-1">
                      <span className="truncate" title={svc.name}>{svc.name}</span>
                      <button
                        type="button"
                        onClick={() => removeService(id)}
                        className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                        title={`Remove ${svc.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="h-24 rounded-md border bg-muted/20 px-2 py-2">
            <div className="flex flex-wrap gap-1.5">
              {value.map((id) => {
                const svc = serviceMap.get(id)
                if (!svc) return null
                return (
                  <Badge key={id} variant="secondary" className="max-w-full gap-1 pr-1">
                    <span className="truncate" title={svc.name}>{svc.name}</span>
                    <button
                      type="button"
                      onClick={() => removeService(id)}
                      className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                      title={`Remove ${svc.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          </ScrollArea>
        )
      )}
    </div>
  )
}
