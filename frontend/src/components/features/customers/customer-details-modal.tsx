import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  Award,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Users,
  Eye,
  Edit,
  Clock,
  History,
} from "lucide-react"
import { CustomerPointsDashboard } from "@/components/features/customers/customer-info-parts/customer-points-dashboard"
import { PointsHistory } from "@/components/features/customers/customer-info-parts/points-history"
import type { Customer } from "@/types/customer"
import type { Appointment } from "@/types/appointment"

interface CustomerDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  modalView: "details" | "treatments" | "loyalty"
  setModalView: (view: "details" | "treatments" | "loyalty") => void
  formatDate: (date?: string) => string
  isInactiveClient: (customer: Customer) => boolean
  inactiveDate: (customer: Customer) => Date | null
  onBookAppointment: (customer: Customer) => void
  onEditProfile: (customer: Customer) => void
  isUpdating: boolean
  showPointsHistory: boolean
  setShowPointsHistory: (show: boolean) => void
  historyRefreshKey: number
  redeemReward: (reward: any) => Promise<void>
  earnPoints: (points: number, reason: string) => Promise<void>
  // Treatment related
  customerAppointments: any[]
  getAppointmentStatusVariant: (status: string | undefined) => "success" | "destructive" | "warning" | "info" | "outline"
  onOpenTreatmentDoc: (appt: Appointment) => void
}

export function CustomerDetailsModal({
  open,
  onOpenChange,
  customer,
  modalView,
  setModalView,
  formatDate,
  isInactiveClient,
  inactiveDate,
  onBookAppointment,
  onEditProfile,
  isUpdating,
  showPointsHistory,
  setShowPointsHistory,
  historyRefreshKey,
  redeemReward,
  earnPoints,
  customerAppointments,
  getAppointmentStatusVariant,
  onOpenTreatmentDoc,
}: CustomerDetailsModalProps) {
  if (!customer) return null

  const displayName = customer.name || `${customer.first_name || ''} ${customer.middle_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{displayName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Client since {formatDate(customer.created_at)}</p>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <div className="hidden md:flex w-64 shrink-0 flex-col gap-2 border-r bg-muted/20 p-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Quick Actions</h4>
            <Button
              variant={modalView === "details" ? "default" : "outline"}
              className="justify-start underline-offset-4"
              onClick={() => setModalView("details")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Details
            </Button>
            <Button
              variant={modalView === "treatments" ? "default" : "outline"}
              className="justify-start underline-offset-4"
              onClick={() => setModalView("treatments")}
            >
              <History className="mr-2 h-4 w-4" />
              Treatments
            </Button>
            <Button
              variant={modalView === "loyalty" ? "default" : "outline"}
              className="justify-start underline-offset-4"
              onClick={() => setModalView("loyalty")}
            >
              <Award className="mr-2 h-4 w-4" />
              Rewards & Points
            </Button>
            <Separator className="my-1" />
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onBookAppointment(customer)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onEditProfile(customer)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
              {modalView === "details" && (
                <DetailsView
                  customer={customer}
                  formatDate={formatDate}
                  isInactiveClient={isInactiveClient}
                  inactiveDate={inactiveDate}
                />
              )}
              {modalView === "loyalty" && (
                <LoyaltyView
                  customer={customer}
                  formatDate={formatDate}
                  isUpdating={isUpdating}
                  showPointsHistory={showPointsHistory}
                  setShowPointsHistory={setShowPointsHistory}
                  historyRefreshKey={historyRefreshKey}
                  redeemReward={redeemReward}
                  earnPoints={earnPoints}
                />
              )}
              {modalView === "treatments" && (
                <TreatmentsView
                  customerAppointments={customerAppointments}
                  getAppointmentStatusVariant={getAppointmentStatusVariant}
                  onOpenTreatmentDoc={onOpenTreatmentDoc}
                  formatDate={formatDate}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface DetailsViewProps {
  customer: Customer
  formatDate: (date?: string) => string
  isInactiveClient: (customer: Customer) => boolean
  inactiveDate: (customer: Customer) => Date | null
}

function DetailsView({ customer, formatDate, isInactiveClient, inactiveDate }: DetailsViewProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                <p className="text-3xl font-bold text-primary">{customer.points || 0}</p>
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
                <p className="text-3xl font-bold">{customer.visits || 0}</p>
              </div>
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Contact Information
        </h4>
        <div className="space-y-3 pl-6">
          {customer.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm text-muted-foreground">{customer.address}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Profile Details
        </h4>
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">NFC Card</p>
            <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{customer.nfc_uid}</code>
          </div>
          {customer.date_of_birth && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Birthday</p>
              <p className="text-sm">{formatDate(customer.date_of_birth)}</p>
            </div>
          )}
          {customer.gender && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Gender</p>
              <p className="text-sm capitalize">{customer.gender}</p>
            </div>
          )}
          {customer.skin_type && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Skin Type</p>
              <p className="text-sm capitalize">{customer.skin_type}</p>
            </div>
          )}
        </div>
      </div>

      {customer.allergies && (
        <div className="space-y-3">
          <h4 className="text-base font-semibold text-destructive">Allergies</h4>
          <div className="rounded-lg border bg-destructive/10 border-destructive/30 p-4">
            <p className="text-sm text-destructive/80 font-medium whitespace-pre-wrap">
              {customer.allergies}
            </p>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground pt-2 flex flex-wrap items-center gap-4">
        <div>Last visit: {formatDate(customer.last_visit)}</div>
        {isInactiveClient(customer) && (
          <div>Inactive since: {formatDate(inactiveDate(customer) || undefined)}</div>
        )}
        {customer.archived_at && (
          <div>Archived on: {formatDate(customer.archived_at)}</div>
        )}
      </div>
    </>
  )
}

interface LoyaltyViewProps {
  customer: Customer
  formatDate: (date?: string) => string
  isUpdating: boolean
  showPointsHistory: boolean
  setShowPointsHistory: (show: boolean) => void
  historyRefreshKey: number
  redeemReward: (reward: any) => Promise<void>
  earnPoints: (points: number, reason: string) => Promise<void>
}

function LoyaltyView({
  customer,
  formatDate,
  isUpdating,
  showPointsHistory,
  setShowPointsHistory,
  historyRefreshKey,
  redeemReward,
  earnPoints,
}: LoyaltyViewProps) {
  return (
    <div className="space-y-6">
      <h4 className="text-xl font-semibold flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        Loyalty Points & Rewards
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Available Points</p>
                <p className="text-4xl font-bold text-primary">{customer.points || 0}</p>
              </div>
              <Award className="h-12 w-12 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Visits</p>
            <p className="text-2xl font-bold">{customer.visits || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Client since {formatDate(customer.created_at)}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-4">
        <CustomerPointsDashboard
          customerId={customer.id}
          isUpdating={isUpdating}
          currentPoints={customer.points || 0}
          showHistory={showPointsHistory}
          onRedeemReward={redeemReward}
          onEarnPoints={earnPoints}
          onToggleHistory={() => setShowPointsHistory(!showPointsHistory)}
        />
        
        {showPointsHistory && (
          <div className="mt-4 pt-4 border-t">
            <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
               <Clock className="h-4 w-4" />
               Transaction History
            </h5>
            <PointsHistory customerId={customer.id} refreshKey={historyRefreshKey} />
          </div>
        )}
      </div>
    </div>
  )
}

interface TreatmentsViewProps {
  customerAppointments: Appointment[]
  getAppointmentStatusVariant: (status: string | undefined) => "success" | "destructive" | "warning" | "info" | "outline"
  onOpenTreatmentDoc: (appt: Appointment) => void
  formatDate: (date?: string) => string
}

function TreatmentsView({ customerAppointments, getAppointmentStatusVariant, onOpenTreatmentDoc, formatDate }: TreatmentsViewProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-base font-semibold">Treatment History</h4>
      
      {customerAppointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No treatment history found.</p>
      ) : (
        <div className="space-y-3">
          {customerAppointments.map((appt) => (
            <Card key={appt.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold">{appt.treatment_name || appt.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(appt.start_time)}
                    </div>
                    {appt.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 italic">
                        "{appt.notes}"
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getAppointmentStatusVariant(appt.status)} className="capitalize">
                      {appt.status?.replace("-", " ") || "Unknown"}
                    </Badge>
                    {(appt.status === "completed" || appt.status === "no-show") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenTreatmentDoc(appt)}
                      >
                        Doc & Photos
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
