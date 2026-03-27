import { Phone, Mail, MapPin, Archive, Clock, Eye, Edit, Calendar, ArchiveRestore } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Customer } from "@/types/customer"

interface CustomerListProps {
  isLoading: boolean
  paginatedCustomers: Customer[]
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
  setSelectedCustomer: (customer: Customer) => void
  setPrefillCustomer: (customer: Customer) => void
  setAppointmentDialogOpen: (open: boolean) => void
  openProfileEditor: (customer: Customer) => void
  toggleArchive: (customer: Customer) => void
  isArchivedClient: (customer: Customer) => boolean
  isInactiveClient: (customer: Customer) => boolean
  formatDate: (date?: string) => string
}

export function CustomerList({
  isLoading,
  paginatedCustomers,
  currentPage,
  totalPages,
  setCurrentPage,
  setSelectedCustomer,
  setPrefillCustomer,
  setAppointmentDialogOpen,
  openProfileEditor,
  toggleArchive,
  isArchivedClient,
  isInactiveClient,
  formatDate,
}: CustomerListProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-medium">Client</th>
              <th className="p-4 text-left font-medium">Contact</th>
              <th className="p-4 text-left font-medium">NFC Card</th>
              <th className="p-4 text-left font-medium">Branch</th>
              <th className="p-4 text-left font-medium">Points</th>
              <th className="p-4 text-left font-medium">Visits</th>
              <th className="p-4 text-left font-medium">Last Visit</th>
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
                        {customer.branch_name ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{customer.branch_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
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
                    <ContextMenuItem onClick={() => {
                      setSelectedCustomer(customer)
                      openProfileEditor(customer)
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => toggleArchive(customer)}>
                      {isArchivedClient(customer) ? (
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                      ) : (
                        <Archive className="mr-2 h-4 w-4" />
                      )}
                      {isArchivedClient(customer) ? "Unarchive" : "Archive"}
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
  )
}
