import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Filter,
  Mail,
  Phone,
  Search,
  Users,
  X,
} from "lucide-react"
import { useCounter } from "@/hooks/use-counter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

import type { Customer } from "@/types/customer"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [skinTypeFilter, setSkinTypeFilter] = useState("")
  const [genderFilter, setGenderFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

    setFilteredCustomers(filtered)
    setCurrentPage(1)
  }, [customers, genderFilter, searchQuery, skinTypeFilter])

  useEffect(() => {
    filterCustomers()
  }, [filterCustomers])

  const clearFilters = () => {
    setSearchQuery("")
    setSkinTypeFilter("")
    setGenderFilter("")
  }

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
  const hasActiveFilters = Boolean(skinTypeFilter || genderFilter)

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
                    <th className="p-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Loading clients...
                      </td>
                    </tr>
                  ) : paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No clients found
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b transition-colors hover:bg-muted/30">
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
                                {customer.name || `${customer.first_name} ${customer.last_name}`}
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
                        <td className="p-4">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(customer)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
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
      {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{selectedCustomer.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Client since {formatDate(selectedCustomer.created_at)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <Award className="mx-auto mb-2 h-6 w-6 text-primary" />
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <Calendar className="mx-auto mb-2 h-6 w-6" />
                    <p className="text-xs text-muted-foreground">Visits</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Contact Information</h4>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selectedCustomer.phone}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.address && <div className="text-sm text-muted-foreground">{selectedCustomer.address}</div>}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Profile Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">NFC Card:</div>
                    <div className="font-mono">{selectedCustomer.nfc_uid}</div>

                    {selectedCustomer.date_of_birth && (
                      <>
                        <div className="text-muted-foreground">Birthday:</div>
                        <div>{formatDate(selectedCustomer.date_of_birth)}</div>
                      </>
                    )}

                    {selectedCustomer.gender && (
                      <>
                        <div className="text-muted-foreground">Gender:</div>
                        <div className="capitalize">{selectedCustomer.gender}</div>
                      </>
                    )}

                    {selectedCustomer.skin_type && (
                      <>
                        <div className="text-muted-foreground">Skin Type:</div>
                        <div className="capitalize">{selectedCustomer.skin_type}</div>
                      </>
                    )}
                  </div>
                </div>

                {selectedCustomer.allergies && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Allergies</h4>
                    <p className="rounded bg-red-50 p-2 text-sm text-red-600">{selectedCustomer.allergies}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">Last visit: {formatDate(selectedCustomer.last_visit)}</div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  )
}
