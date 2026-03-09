import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Award,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Edit,
  Eye,
  Filter,
  Mail,
  MapPin,
  Phone,
  Search,
  Users,
  X,
  Archive,
  ArchiveRestore,
} from "lucide-react"
import { useCounter } from "@/hooks/use-counter"
import { useStaff } from "@/hooks/use-staff"
import { useAppointments } from "@/hooks/use-appointments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { AppointmentDialog } from "@/components/features/calendar/calendar-parts/appointment-dialog"
import { supabase } from "@/lib/supabase"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import type { Customer } from "@/types/customer"
import type { IntervalMinutes } from "@/types/appointment"
import { DEFAULT_INTERVAL } from "@/components/features/calendar/calendar-parts/calendar-config"

export default function CustomersPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [cameFromNfc, setCameFromNfc] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // which panel is shown inside the customer modal
  const [modalView, setModalView] = useState<"details" | "treatments">("details")

  const [skinTypeFilter, setSkinTypeFilter] = useState("")
  const [genderFilter, setGenderFilter] = useState("")
  // status can be '', 'active', 'inactive', 'archived'
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive" | "archived">("")
  const [sortMetric, setSortMetric] = useState<"" | "points" | "visits">("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)

  // number of days without a visit before a client is considered inactive
  const INACTIVE_THRESHOLD_DAYS = 60

  const isInactiveClient = (c: Customer) => {
    if (c.archived_at) return false
    // prefer explicit last_inactive flag
    if (c.last_inactive) return true
    if (!c.last_visit) return true
    const diffMs = Date.now() - new Date(c.last_visit).getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays > INACTIVE_THRESHOLD_DAYS
  }

  const inactiveDate = (c?: Customer) => {
    if (!c) return null
    if (c.last_inactive) return c.last_inactive
    if (!c.last_visit) return null
    const d = new Date(c.last_visit)
    d.setDate(d.getDate() + INACTIVE_THRESHOLD_DAYS)
    return d.toISOString()
  }

  const isArchivedClient = (c: Customer) => Boolean(c.archived_at)

  const isActiveClient = (c: Customer) => !isArchivedClient(c) && !isInactiveClient(c)

  const statusRank = (c: Customer) => {
    if (isArchivedClient(c)) return 2
    if (isInactiveClient(c)) return 1
    return 0
  }

  // generic dropdown builder for radio options
  function renderFilter<T extends string>(
    label: string,
    value: T,
    onChange: (val: T) => void,
    options: Array<{ label: string; value: T }>,
    disabled?: boolean,
  ) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between h-9 text-sm"
            disabled={disabled}
          >
            {label}: {options.find((o) => o.value === value)?.label || options[0].label}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
            {options.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Appointment dialog state
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false)
  const [prefillCustomer, setPrefillCustomer] = useState<Customer | null>(null)
  const { staff = [] } = useStaff()
  const { appointments, addAppointment } = useAppointments()
  const [selectedDate] = useState(new Date())
  const [interval] = useState<IntervalMinutes>(DEFAULT_INTERVAL)
  
  const clinicHours = { open: 9, close: 18 }

  // metrics should only consider non‑archived clients
  const activeCustomers = useMemo(() => customers.filter((c) => !isArchivedClient(c)), [customers])
  const totalClients = activeCustomers.length
  const totalPointsIssued = useMemo(
    () => activeCustomers.reduce((sum, c) => sum + (c.points || 0), 0),
    [activeCustomers],
  )
  const totalVisits = useMemo(
    () => activeCustomers.reduce((sum, c) => sum + (c.visits || 0), 0),
    [activeCustomers],
  )
  const registeredCards = activeCustomers.length

  const totalClientsCount = useCounter(totalClients, 1500)
  const totalPointsCount = useCounter(totalPointsIssued, 1500)
  const totalVisitsCount = useCounter(totalVisits, 1500)
  const registeredCardsCount = useCounter(registeredCards, 1500)

  useEffect(() => {
    document.title = "Customers - FG Aesthetic Centre"
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      const list: Customer[] = data || []
      setCustomers(list)

      // persist inactive timestamp for newly-inactive clients
      const toUpdate: Array<{ id: string; last_inactive: string }> = []
      list.forEach((c) => {
        if (!c.archived_at && !c.last_inactive && isInactiveClient(c)) {
          const dt = inactiveDate(c)
          if (dt) {
            toUpdate.push({ id: c.id, last_inactive: dt })
          }
        }
      })
      if (toUpdate.length) {
        try {
          await supabase.from("customers").upsert(toUpdate)
          // refresh local copy after writing
          setCustomers((prev) =>
            prev.map((c) => {
              const u = toUpdate.find((x) => x.id === c.id)
              return u ? { ...c, last_inactive: u.last_inactive } : c
            }),
          )
        } catch (e) {
          console.error("Failed to set last_inactive:", e)
        }
      }
    } catch (err) {
      console.error("Error fetching customers:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleArchive = async (customer: Customer) => {
    // flips the archived_at value
    try {
      const newArchived = customer.archived_at ? null : new Date().toISOString()
      const { error } = await supabase
        .from("customers")
        .update({ archived_at: newArchived })
        .eq("id", customer.id)
      if (error) throw error
      // refetch so filters recompute
      fetchCustomers()
    } catch (err) {
      console.error("Error updating archive status:", err)
    }
  }

  const filterCustomers = useCallback(() => {
    let filtered = [...customers]

    // text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.first_name?.toLowerCase().includes(query) ||
          c.last_name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.nfc_uid?.toLowerCase().includes(query),
      )
    }

    // skin/gender filters
    if (skinTypeFilter) {
      filtered = filtered.filter((c) => c.skin_type === skinTypeFilter)
    }
    if (genderFilter) {
      filtered = filtered.filter((c) => c.gender === genderFilter)
    }

    // status filter (active / inactive / archived)
    if (statusFilter) {
      if (statusFilter === "active") {
        filtered = filtered.filter(isActiveClient)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(isInactiveClient)
      } else if (statusFilter === "archived") {
        filtered = filtered.filter(isArchivedClient)
      }
    } else {
      // default: hide archived clients unless user explicitly requests them
      filtered = filtered.filter((c) => !isArchivedClient(c))
    }

    // sort by status so that active come first, inactive next, archived last
    filtered.sort((a, b) => statusRank(a) - statusRank(b))

    // then apply metric sorting if requested
    if (sortMetric) {
      filtered.sort((a, b) => {
        const aValue = sortMetric === "points" ? (a.points || 0) : (a.visits || 0)
        const bValue = sortMetric === "points" ? (b.points || 0) : (b.visits || 0)
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      })
    }

    setFilteredCustomers(filtered)
    setCurrentPage(1)
  }, [
    customers,
    genderFilter,
    searchQuery,
    skinTypeFilter,
    sortMetric,
    sortOrder,
    statusFilter,
  ])

  useEffect(() => {
    filterCustomers()
  }, [filterCustomers])

  const clearFilters = () => {
    setSearchQuery("")
    setSkinTypeFilter("")
    setGenderFilter("")
    setStatusFilter("")
    setSortMetric("")
    setSortOrder("desc")
  }

  const hasActiveFilters = Boolean(skinTypeFilter || genderFilter || statusFilter || sortMetric)

  // if navigation brought a customer object, open the modal
  useEffect(() => {
    const { customer, fromNfc } = (location.state as any) || {}
    if (customer) {
      setSelectedCustomer(customer)
    }
    if (fromNfc) {
      setCameFromNfc(true)
    }
    // clear the state so it doesn't reopen later
    if (customer || fromNfc) {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [location.state])

  // when customer is selected open, reset modal view to details
  useEffect(() => {
    if (selectedCustomer) {
      setModalView("details")
    }
  }, [selectedCustomer])

  // if we opened from the NFC scanner, clear the flag when the modal closes
  // and make sure we stay on the same dashboard/customers route (clears state)
  useEffect(() => {
    if (selectedCustomer === null && cameFromNfc) {
      navigate("/dashboard/customers", { replace: true })
      setCameFromNfc(false)
    }
  }, [selectedCustomer, cameFromNfc, navigate])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClientsCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Points Issued</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPointsCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVisitsCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Registered Cards</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{registeredCardsCount.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or NFC ID..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Active</span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-muted/50 p-4">
              <div>
                {renderFilter(
                  "Skin Type",
                  skinTypeFilter,
                  setSkinTypeFilter,
                  [
                    { label: "All Types", value: "" },
                    { label: "Normal", value: "normal" },
                    { label: "Dry", value: "dry" },
                    { label: "Oily", value: "oily" },
                    { label: "Combination", value: "combination" },
                    { label: "Sensitive", value: "sensitive" },
                  ],
                )}
              </div>
              <div>
                {renderFilter(
                  "Gender",
                  genderFilter,
                  setGenderFilter,
                  [
                    { label: "All Genders", value: "" },
                    { label: "Female", value: "female" },
                    { label: "Male", value: "male" },
                    { label: "Other", value: "other" },
                  ],
                )}
              </div>
              <div>
                {renderFilter(
                  "Status",
                  statusFilter,
                  setStatusFilter as any,
                  [
                    { label: "All Statuses", value: "" },
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                    { label: "Archived", value: "archived" },
                  ],
                )}
              </div>
              <div>
                {renderFilter(
                  "Sort Metric",
                  sortMetric,
                  setSortMetric as any,
                  [
                    { label: "None", value: "" },
                    { label: "Points", value: "points" },
                    { label: "Visits", value: "visits" },
                  ],
                )}
              </div>
              <div>
                {renderFilter(
                  "Sort Order",
                  sortOrder,
                  setSortOrder as any,
                  [
                    { label: "Ascending", value: "asc" },
                    { label: "Descending", value: "desc" },
                  ],
                  !sortMetric, // disable until metric chosen
                )}
              </div>
              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mb-4 text-sm text-muted-foreground">
            Showing {paginatedCustomers.length} of {filteredCustomers.length} clients
          </div>

          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left font-medium">Client</th>
                    <th className="p-4 text-left font-medium">Contact</th>
                    <th className="p-4 text-left font-medium">NFC Card</th>
                    <th className="p-4 text-left font-medium">Points</th>
                    <th className="p-4 text-left font-medium">Visits</th>
                    <th className="p-4 text-left font-medium">Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Loading clients...
                      </td>
                    </tr>
                  ) : paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No clients found
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <ContextMenu key={customer.id}>
                        <ContextMenuTrigger asChild>
                          <tr
                            onClick={() => setSelectedCustomer(customer)}
                            className={
                              "border-b transition-colors hover:bg-muted/30 cursor-pointer" +
                              ((isArchivedClient(customer) || isInactiveClient(customer)) ? " opacity-50" : "") +
                              (isArchivedClient(customer) ? " italic" : "")
                            }
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                  <span className="text-sm font-medium text-primary">
                                    {customer.first_name?.[0] || customer.name?.[0] || "?"}
                                    {customer.last_name?.[0] || ""}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {(() => {
                                      let displayName = customer.name || 'Unknown'
                                      if (customer.first_name || customer.last_name) {
                                        displayName = customer.first_name || ''
                                        if (customer.middle_name) {
                                          displayName += ` ${customer.middle_name.charAt(0)}.`
                                        }
                                        if (customer.last_name) {
                                          displayName += ` ${customer.last_name}`
                                        }
                                        displayName = displayName.trim()
                                      }
                                      return displayName
                                    })()}
                                  </div>
                                  <div className="text-xs capitalize text-muted-foreground">
                                    {customer.skin_type && `${customer.skin_type} skin`}
                                    {customer.gender && customer.skin_type && " • "}
                                    {customer.gender}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                {customer.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    {customer.phone}
                                  </div>
                                )}
                                {customer.email && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {customer.email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <code className="rounded bg-muted px-2 py-1 text-xs">{customer.nfc_uid}</code>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-primary">{customer.points || 0}</span>
                            </td>
                            <td className="p-4">{customer.visits || 0}</td>
                            <td className="p-4 text-sm text-muted-foreground relative">
                              {formatDate(customer.last_visit)}
                              {(isArchivedClient(customer) || isInactiveClient(customer)) && (
                                <div className="absolute top-1 right-2 flex items-center space-x-1 text-xs">
                                  {isArchivedClient(customer) ? (
                                    <Archive className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className={isArchivedClient(customer) ? "text-red-600" : "text-gray-500"}>
                                    {isArchivedClient(customer) ? "Archived" : "Inactive"}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => setSelectedCustomer(customer)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {
                            setPrefillCustomer(customer)
                            setAppointmentDialogOpen(true)
                          }}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Set Appointment
                          </ContextMenuItem>
                          <ContextMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </ContextMenuItem>                          <ContextMenuItem onClick={() => toggleArchive(customer)}>
                            {isArchivedClient(customer) ? (
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                            ) : (
                              <Archive className="mr-2 h-4 w-4" />
                            )}
                            {isArchivedClient(customer) ? "Unarchive" : "Archive"}
                          </ContextMenuItem>                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 border-b">
            <DialogTitle className="text-2xl">
              {selectedCustomer?.name || `${selectedCustomer?.first_name || ''} ${selectedCustomer?.middle_name || ''} ${selectedCustomer?.last_name || ''}`.trim()}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Client since {formatDate(selectedCustomer?.created_at)}</p>
          </DialogHeader>

          <div className="flex h-[calc(90vh-5.25rem)]">
            <div className="hidden md:flex w-64 shrink-0 flex-col gap-2 border-r bg-muted/20 p-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Quick Actions</h4>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setModalView("details")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Details
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setModalView("treatments")}
              >
                <Award className="mr-2 h-4 w-4" />
                Treatments
              </Button>
              <Separator className="my-1" />
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setPrefillCustomer(selectedCustomer)
                  setAppointmentDialogOpen(true)
                  setSelectedCustomer(null)
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Book Appointment
              </Button>
              <Button variant="outline" className="justify-start">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-4">
              {modalView === "details" ? (
                <> {/* details view */}
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                            <p className="text-3xl font-bold text-primary">{selectedCustomer?.points || 0}</p>
                          </div>
                          <Award className="h-10 w-10 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Visits</p>
                            <p className="text-3xl font-bold">{selectedCustomer?.visits || 0}</p>
                          </div>
                          <Calendar className="h-10 w-10 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Information
                    </h4>
                    <div className="space-y-3 pl-6">
                      {selectedCustomer?.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedCustomer.phone}</span>
                        </div>
                      )}
                      {selectedCustomer?.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer?.address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm text-muted-foreground">{selectedCustomer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Profile Details */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Profile Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">NFC Card</p>
                        <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{selectedCustomer?.nfc_uid}</code>
                      </div>

                      {selectedCustomer?.date_of_birth && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Birthday</p>
                          <p className="text-sm">{formatDate(selectedCustomer.date_of_birth)}</p>
                        </div>
                      )}

                      {selectedCustomer?.gender && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Gender</p>
                          <p className="text-sm capitalize">{selectedCustomer.gender}</p>
                        </div>
                      )}

                      {selectedCustomer?.skin_type && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Skin Type</p>
                          <p className="text-sm capitalize">{selectedCustomer.skin_type}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Allergies */}
                  {selectedCustomer?.allergies && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-base font-semibold text-red-600">⚠️ Allergies</h4>
                        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                          <p className="text-sm text-red-700 font-medium">{selectedCustomer.allergies}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* timestamps */}
                  <div className="text-xs text-muted-foreground pt-2 flex flex-wrap items-center gap-4">
                    <div>Last visit: {formatDate(selectedCustomer?.last_visit)}</div>
                    {selectedCustomer && isInactiveClient(selectedCustomer) && (
                      <>
                        <div>Inactive since: {formatDate(inactiveDate(selectedCustomer) || undefined)}</div>
                      </>
                    )}
                    {selectedCustomer?.archived_at && (
                      <div>Archived on: {formatDate(selectedCustomer.archived_at)}</div>
                    )}
                  </div>
                </>
              ) : (
                <> {/* treatments view */}
                  {selectedCustomer && (
                    <>
                      {/* appointment log list */}
                      <div className="space-y-3">
                        <h4 className="text-lg font-semibold">Appointment History</h4>
                        {appointments
                          .filter((a) => a.customer_id === selectedCustomer?.id)
                          .length === 0 ? (
                          <p className="text-sm text-muted-foreground">No appointments found.</p>
                        ) : (
                          <div className="space-y-2">
                            {appointments
                              .filter((a) => a.customer_id === selectedCustomer?.id)
                              .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                              .map((a) => (
                                <Card key={a.id} className="py-0 gap-0">
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-1">
                                        <p className="font-medium text-sm">{a.title}</p>
                                        {a.treatment_name && (
                                          <p className="text-xs text-muted-foreground">
                                            Treatment: {a.treatment_name}
                                          </p>
                                        )}
                                        {a.staff_name && (
                                          <p className="text-xs text-muted-foreground">
                                            Staff: {a.staff_name}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right space-y-1">
                                        <p className="text-sm font-medium">
                                          {new Date(a.start_time).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(a.start_time).toLocaleTimeString(undefined, {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                          {a.end_time && (
                                            <>
                                              {" – "}
                                              {new Date(a.end_time).toLocaleTimeString(undefined, {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    {a.notes && (
                                      <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                        {a.notes}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="space-y-3 pb-2 md:hidden">
                <Separator />
                <h4 className="text-base font-semibold">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => setModalView("details")}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Details
                  </Button>
              <Button
                    variant="outline"
                    onClick={() => setModalView("treatments")}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Treatments
                  </Button>
              <Button
                    variant="outline"
                    onClick={() => {
                      setPrefillCustomer(selectedCustomer)
                      setAppointmentDialogOpen(true)
                      setSelectedCustomer(null)
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Appointment
                  </Button>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        staff={staff}
        selectedDate={selectedDate}
        interval={interval}
        clinicHours={clinicHours}
        appointments={appointments}
        blockedTimes={[]}
        onSave={(appointment) => {
          addAppointment(appointment)
          setAppointmentDialogOpen(false)
          setPrefillCustomer(null)
        }}
        prefillCustomerId={prefillCustomer?.id}
        prefillCustomerName={prefillCustomer?.name || `${prefillCustomer?.first_name || ''} ${prefillCustomer?.last_name || ''}`.trim()}
      />
    </div>
  )
}
