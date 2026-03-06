import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
import type { Customer } from "@/types/customer"
import type { Appointment, IntervalMinutes } from "@/types/appointment"
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

  const [skinTypeFilter, setSkinTypeFilter] = useState("")
  const [genderFilter, setGenderFilter] = useState("")
  const [sortMetric, setSortMetric] = useState<"" | "points" | "visits">("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)

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

  const totalClients = customers.length
  const totalPointsIssued = useMemo(
    () => customers.reduce((sum, c) => sum + (c.points || 0), 0),
    [customers],
  )
  const totalVisits = useMemo(
    () => customers.reduce((sum, c) => sum + (c.visits || 0), 0),
    [customers],
  )
  const registeredCards = customers.length

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
      setCustomers(data || [])
    } catch (err) {
      console.error("Error fetching customers:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const filterCustomers = useCallback(() => {
    let filtered = [...customers]

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

    if (skinTypeFilter) {
      filtered = filtered.filter((c) => c.skin_type === skinTypeFilter)
    }

    if (genderFilter) {
      filtered = filtered.filter((c) => c.gender === genderFilter)
    }

    if (sortMetric) {
      filtered.sort((a, b) => {
        const aValue = sortMetric === "points" ? (a.points || 0) : (a.visits || 0)
        const bValue = sortMetric === "points" ? (b.points || 0) : (b.visits || 0)
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      })
    }

    setFilteredCustomers(filtered)
    setCurrentPage(1)
  }, [customers, genderFilter, searchQuery, skinTypeFilter, sortMetric, sortOrder])

  useEffect(() => {
    filterCustomers()
  }, [filterCustomers])

  const clearFilters = () => {
    setSearchQuery("")
    setSkinTypeFilter("")
    setGenderFilter("")
    setSortMetric("")
    setSortOrder("desc")
  }

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
  const hasActiveFilters = Boolean(skinTypeFilter || genderFilter || sortMetric)

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
              <div className="space-y-2">
                <label className="text-sm font-medium">Skin Type</label>
                <select
                  title="Skin Type"
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={skinTypeFilter}
                  onChange={(e) => setSkinTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="normal">Normal</option>
                  <option value="dry">Dry</option>
                  <option value="oily">Oily</option>
                  <option value="combination">Combination</option>
                  <option value="sensitive">Sensitive</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <select
                  title="Gender"
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                >
                  <option value="">All Genders</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Metric</label>
                <select
                  title="Sort Metric"
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={sortMetric}
                  onChange={(e) => setSortMetric(e.target.value as "" | "points" | "visits")}
                >
                  <option value="">None</option>
                  <option value="points">Points</option>
                  <option value="visits">Visits</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <select
                  title="Sort Order"
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={sortOrder}
                  disabled={!sortMetric}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
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
                            className="border-b transition-colors hover:bg-muted/30 cursor-pointer"
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
                            <td className="p-4 text-sm text-muted-foreground">{formatDate(customer.last_visit)}</td>
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
                          </ContextMenuItem>
                        </ContextMenuContent>
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

              {/* Last Visit */}
              <div className="text-xs text-muted-foreground pt-2">
                Last visit: {formatDate(selectedCustomer?.last_visit)}
              </div>

              <div className="space-y-3 pb-2 md:hidden">
                <Separator />
                <h4 className="text-base font-semibold">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
