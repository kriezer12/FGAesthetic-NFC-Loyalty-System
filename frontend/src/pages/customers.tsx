import { useEffect, useMemo, useState, useCallback, useRef } from "react"
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
  Image,
  FileText,
  Trash2,
  Download,
  Plus,
} from "lucide-react"
import { useCounter } from "@/hooks/use-counter"
import { useAuth } from "@/contexts/auth-context"
import { useStaff } from "@/hooks/use-staff"
import { useAppointments } from "@/hooks/use-appointments"
import { useBranches } from "@/hooks/use-branches"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { NFCScanner } from "@/components/features/nfc"
import { CustomerPointsDashboard } from "@/components/features/customers/customer-info-parts/customer-points-dashboard"
import { PointsHistory } from "@/components/features/customers/customer-info-parts/points-history"
import { TreatmentHistory } from "@/components/features/customers/treatment-history"
import { TreatmentStatusManager } from "@/components/features/customers/treatment-status-manager"
import { LoyaltyReward } from "./loyalty-admin"
import { supabase } from "@/lib/supabase"
import { uploadToSupabase, getSignedUrl } from "@/lib/supabase-storage"
import { convertToWebP, downloadImageAsJpeg } from "@/lib/image-utils"
import { calculateChanges } from "@/lib/activity-logger"
import { logUserAction } from "@/lib/user-log"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import type { Customer } from "@/types/customer"
import type { Appointment, IntervalMinutes } from "@/types/appointment"
import type { Service } from "@/types/service"
import { DEFAULT_INTERVAL } from "@/components/features/calendar/calendar-parts/calendar-config"

export default function CustomersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile } = useAuth()
  const { branches } = useBranches()

  const [cameFromNfc, setCameFromNfc] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  useEffect(() => {
    // This will be set by filterCustomers()
  }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // which panel is shown inside the customer modal
  const [modalView, setModalView] = useState<"details" | "appointments" | "treatments" | "loyalty">("details")
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    skin_type: "",
    address: "",
    emergency_contact: "",
    allergies: "",
    notes: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [assignNfcModalOpen, setAssignNfcModalOpen] = useState(false)
  const [isAssigningNfc, setIsAssigningNfc] = useState(false)
  const [shouldReopenProfileEditor, setShouldReopenProfileEditor] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null)
  const [reassignPrompt, setReassignPrompt] = useState<
    | {
        nfcUid: string
        ownerName: string
        ownerId: string
      }
    | null
  >(null)

  const handleAssignNfcCard = async (nfcUid: string) => {
    if (!selectedCustomer) return
    if (reassignPrompt) return // already prompting

    setIsAssigningNfc(true)
    setAssignSuccessMessage(null)

    try {
      const selectedName =
        selectedCustomer.name ||
        `${selectedCustomer.first_name || ""} ${selectedCustomer.last_name || ""}`.trim() ||
        "Customer"

      const { data: existingOwner } = await supabase
        .from("customers")
        .select("id, name, first_name, last_name")
        .eq("nfc_uid", nfcUid)
        .single()

      if (existingOwner && existingOwner.id !== selectedCustomer.id) {
        const ownerName =
          existingOwner.name ||
          `${existingOwner.first_name || ""} ${existingOwner.last_name || ""}`.trim() ||
          "Another customer"

        setReassignPrompt({ nfcUid, ownerName, ownerId: existingOwner.id })
        return
      }

      if (existingOwner && existingOwner.id === selectedCustomer.id) {
        setScanMessage("This card is already assigned to the selected customer. Please scan a different card.")
        return
      }

      const { data: updated, error } = await supabase
        .from("customers")
        .update({ nfc_uid: nfcUid })
        .eq("id", selectedCustomer.id)
        .select()
        .single()

      if (!error && updated) {
        setSelectedCustomer(updated)
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setAssignSuccessMessage(`Assigned card ${nfcUid} to ${selectedCustomer.name || selectedName}.`)
      }
    } catch (err) {
      console.error("Failed to assign NFC card:", err)
    } finally {
      setIsAssigningNfc(false)
    }
  }

  const handleConfirmReassign = async () => {
    if (!reassignPrompt || !selectedCustomer) return

    setIsAssigningNfc(true)
    try {
      const { data: updated, error } = await supabase
        .from("customers")
        .update({ nfc_uid: reassignPrompt.nfcUid })
        .eq("id", selectedCustomer.id)
        .select()
        .single()

      if (!error && updated) {
        setSelectedCustomer(updated)
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      }
    } catch (err) {
      console.error("Failed to reassign NFC card:", err)
    } finally {
      setIsAssigningNfc(false)
      setAssignNfcModalOpen(false)
      setReassignPrompt(null)

    }
  }

  const handleCancelReassign = () => {
    setReassignPrompt(null)
    setIsAssigningNfc(false)
  }

  const [showPointsHistory, setShowPointsHistory] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const [skinTypeFilter, setSkinTypeFilter] = useState("")
  const [genderFilter, setGenderFilter] = useState("")
  // status can be '', 'active', 'inactive', 'archived'
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive" | "archived">("")
  const [sortMetric, setSortMetric] = useState<"" | "points" | "visits">("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [branchFilter, setBranchFilter] = useState("")
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

  const getAppointmentStatusVariant = (status: string | undefined) => {
    switch (status) {
      case "completed":
        return "success"
      case "cancelled":
        return "destructive"
      case "in-progress":
        return "warning"
      case "confirmed":
        return "success"
      case "scheduled":
        return "info"
      default:
        return "outline"
    }
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
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null)
  const [prefillCustomer, setPrefillCustomer] = useState<Customer | null>(null)
  const [prefillServiceIds, setPrefillServiceIds] = useState<string[]>([])
  const [pendingReward, setPendingReward] = useState<LoyaltyReward | null>(null)
  const reschedulePendingRef = useRef(false)
  const { staff = [] } = useStaff()
  
  // Treatment documentation state
  const [treatmentDocModalOpen, setTreatmentDocModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [selectedAppointmentGroup, setSelectedAppointmentGroup] = useState<{
    sessions: any[]
    isPackage: boolean
    primaryAppointment: any
  } | null>(null)

  useEffect(() => {
    if (!treatmentDocModalOpen && reschedulePendingRef.current) {
      reschedulePendingRef.current = false
      setAppointmentDialogOpen(true)
    }
  }, [treatmentDocModalOpen])
  const [uploadSectionOpen, setUploadSectionOpen] = useState({
    beforeAfter: false,
    forms: false,
    miscellaneous: false,
  })
  const [treatmentPhotos, setTreatmentPhotos] = useState<Array<{ id: string; path: string; url: string; type: 'before' | 'after' | 'other' }>>([])
  const [treatmentConsentPath, setTreatmentConsentPath] = useState<string>("")
  const [treatmentConsentUrl, setTreatmentConsentUrl] = useState<string>("")
  const [treatmentConsentUploaded, setTreatmentConsentUploaded] = useState(false)
  const [treatmentGalleryError, setTreatmentGalleryError] = useState("")
  const [treatmentConsentError, setTreatmentConsentError] = useState("")
  const [treatmentGalleryUploading, setTreatmentGalleryUploading] = useState(false)
  const [treatmentConsentUploading, setTreatmentConsentUploading] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointments()

  const openRescheduleAppointment = (appt: Appointment) => {
    // When rescheduling, ensure the appointment re-opens as a new scheduled appointment
    setAppointmentToEdit({ ...appt, status: "scheduled" })
    setPrefillCustomer(selectedCustomer)
    setPrefillServiceIds(appt.service_ids || [])
    reschedulePendingRef.current = true
    setTreatmentDocModalOpen(false)
  }

  const treatmentGroupSessions = useMemo(() => selectedAppointmentGroup?.sessions ?? [], [selectedAppointmentGroup])
  const treatmentGroupIsPackage = selectedAppointmentGroup?.isPackage ?? false
  const treatmentGroupTotalSessions = treatmentGroupSessions.length
  const treatmentGroupCompletedSessions = treatmentGroupSessions.filter((s) => s.status === "completed").length
  const treatmentGroupRemainingSessions = treatmentGroupTotalSessions - treatmentGroupCompletedSessions
  const treatmentGroupSessionsSorted = useMemo(
    () => [...treatmentGroupSessions].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [treatmentGroupSessions],
  )

  const [selectedDate] = useState(new Date())
  const [interval] = useState<IntervalMinutes>(DEFAULT_INTERVAL)

  // load service catalog (used to split multi‑service appointments)
  const [services, setServices] = useState<Service[]>([])
  const serviceMap = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  )
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("services").select("*")
      setServices((data || []) as Service[])
    }
    load()
  }, [])
  
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
        .select("*, branches(id, name)")
        .order("created_at", { ascending: false })

      if (error) throw error
      const list: Customer[] = (data || []).map((customer: any) => ({
        ...customer,
        branch_name: customer.branches?.name,
        // Keep branch_id that's already in the customer record
      }))
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

  const redeemReward = async (reward: LoyaltyReward) => {
    if (!selectedCustomer || selectedCustomer.points < reward.points_required) return
    
    if (reward.reward_treatment_id) {
      // If it's a treatment reward, open appointment dialog first
      // Points will be deducted in onSave of the AppointmentDialog
      setPendingReward(reward)
      setPrefillCustomer(selectedCustomer)
      setPrefillServiceIds([reward.reward_treatment_id])
      setAppointmentDialogOpen(true)
      setSelectedCustomer(null) // close details modal
      return
    }

    setIsUpdating(true)
    try {
      const newPoints = selectedCustomer.points - reward.points_required
      const { data, error } = await supabase
        .from("customers")
        .update({ points: newPoints })
        .eq("id", selectedCustomer.id)
        .select()
        .single()
      
      if (!error && data) {
        await supabase
          .from("points_transactions")
          .insert({
            customer_id: selectedCustomer.id,
            points_change: -reward.points_required,
            reason: reward.reward_name,
            type: "redeem"
          })
        
        setCustomers(prev => prev.map(c => c.id === data.id ? data : c))
        setSelectedCustomer(data)
        setHistoryRefreshKey(k => k + 1)
      }
    } catch (err) {
      console.error("Error redeeming reward:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const earnPoints = async (rule: { description?: string; points_earned: number }) => {
    if (!selectedCustomer) return
    setIsUpdating(true)
    try {
      const newPoints = (selectedCustomer.points || 0) + rule.points_earned
      const newVisits = selectedCustomer.visits + 1
      const { data, error } = await supabase
        .from("customers")
        .update({ 
          points: newPoints,
          visits: newVisits,
          last_visit: new Date().toISOString()
        })
        .eq("id", selectedCustomer.id)
        .select()
        .single()
      
      if (!error && data) {
        await supabase
          .from("points_transactions")
          .insert({
            customer_id: selectedCustomer.id,
            points_change: rule.points_earned,
            reason: rule.description || "Earned Points",
            type: "earn"
          })
        
        setCustomers(prev => prev.map(c => c.id === data.id ? data : c))
        setSelectedCustomer(data)
        setHistoryRefreshKey(k => k + 1)
      }
    } catch (err) {
      console.error("Error earning points:", err)
    } finally {
      setIsUpdating(false)
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

  const openProfileEditor = (customer: Customer | null) => {
    if (!customer) return

    setEditingCustomerId(customer.id)
    setProfileForm({
      first_name: customer.first_name || "",
      middle_name: customer.middle_name || "",
      last_name: customer.last_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      date_of_birth: customer.date_of_birth ? customer.date_of_birth.split("T")[0] : "",
      gender: customer.gender || "",
      skin_type: customer.skin_type || "",
      address: customer.address || "",
      emergency_contact: customer.emergency_contact || "",
      allergies: customer.allergies || "",
      notes: customer.notes || "",
    })
    setProfileEditorOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!editingCustomerId) return

    const existingCustomer = customers.find((c) => c.id === editingCustomerId) || null

    const first = profileForm.first_name.trim()
    const middle = profileForm.middle_name.trim()
    const last = profileForm.last_name.trim()
    const fullName = [first, middle, last].filter(Boolean).join(" ").trim()

    const payload = {
      first_name: first || null,
      middle_name: middle || null,
      last_name: last || null,
      name: fullName || null,
      email: profileForm.email.trim() || null,
      phone: profileForm.phone.trim() || null,
      date_of_birth: profileForm.date_of_birth || null,
      gender: profileForm.gender.trim() || null,
      skin_type: profileForm.skin_type.trim() || null,
      address: profileForm.address.trim() || null,
      emergency_contact: profileForm.emergency_contact.trim() || null,
      allergies: profileForm.allergies.trim() || null,
      notes: profileForm.notes.trim() || null,
    }

    setSavingProfile(true)
    try {
      const { data, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingCustomerId)
        .select("*")
        .single()

      if (error) throw error

      setCustomers((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      setSelectedCustomer((prev) => (prev?.id === data.id ? data : prev))

      const beforeSnapshot = existingCustomer
        ? {
            first_name: existingCustomer.first_name || null,
            middle_name: existingCustomer.middle_name || null,
            last_name: existingCustomer.last_name || null,
            name: existingCustomer.name || null,
            email: existingCustomer.email || null,
            phone: existingCustomer.phone || null,
            date_of_birth: existingCustomer.date_of_birth || null,
            gender: existingCustomer.gender || null,
            skin_type: existingCustomer.skin_type || null,
            address: existingCustomer.address || null,
            emergency_contact: existingCustomer.emergency_contact || null,
            allergies: existingCustomer.allergies || null,
            notes: existingCustomer.notes || null,
          }
        : {}

      const afterSnapshot = {
        first_name: data.first_name || null,
        middle_name: data.middle_name || null,
        last_name: data.last_name || null,
        name: data.name || null,
        email: data.email || null,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        skin_type: data.skin_type || null,
        address: data.address || null,
        emergency_contact: data.emergency_contact || null,
        allergies: data.allergies || null,
        notes: data.notes || null,
      }

      await logUserAction({
        actionType: "edited_client_data",
        entityType: "customer",
        entityId: data.id,
        entityName: data.name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Customer",
        branchId: userProfile?.branch_id || null,
        changes: calculateChanges(beforeSnapshot, afterSnapshot),
        metadata: {
          source: "customers_profile_editor",
        },
      })

      setProfileEditorOpen(false)
    } catch (err) {
      console.error("Error updating customer profile:", err)
    } finally {
      setSavingProfile(false)
    }
  }

  // Treatment-specific documentation handlers
  const loadTreatmentPhotos = async (appointmentId: string, customerId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("customer-picture")
        .list(`customer-gallery/${customerId}/appointment-${appointmentId}`)
      
      if (error) {
        console.log("No photos folder for treatment yet")
        setTreatmentPhotos([])
        return
      }

      const photos = (data || [])
        .filter(f => !f.name.includes('_consent_'))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

      const paths = photos.map(f => `customer-gallery/${customerId}/appointment-${appointmentId}/${f.name}`)
      const { data: signedData } = await supabase.storage
        .from("customer-picture")
        .createSignedUrls(paths, 604800)

      const signedMap = new Map(
        (signedData ?? []).map((s) => [s.path ?? "", s.signedUrl ?? ""])
      )

      const photoList = photos.map(f => {
        const path = `customer-gallery/${customerId}/appointment-${appointmentId}/${f.name}`
        const { data: urlData } = supabase.storage
          .from("customer-picture")
          .getPublicUrl(path)
        
        let type: 'before' | 'after' | 'other' = 'other'
        if (f.name.includes('_before_')) type = 'before'
        else if (f.name.includes('_after_')) type = 'after'

        return {
          id: f.name,
          path,
          url: signedMap.get(path) ?? urlData.publicUrl,
          type
        }
      })

      setTreatmentPhotos(photoList)
    } catch (err) {
      console.error("Error loading treatment photos:", err)
      setTreatmentPhotos([])
    }
  }

  const loadTreatmentConsentForm = async (appointmentId: string, customerId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("customer-picture")
        .list(`customer-treatment-consents/${customerId}/appointment-${appointmentId}`)
      
      if (error) {
        console.log("No consent form folder for treatment yet")
        setTreatmentConsentPath("")
        setTreatmentConsentUrl("")
        setTreatmentConsentUploaded(false)
        return
      }

      const consentFiles = (data || [])
        .filter(f => f.name.includes('_consent_'))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

      if (consentFiles.length > 0) {
        const mostRecentFile = consentFiles[0]
        const path = `customer-treatment-consents/${customerId}/appointment-${appointmentId}/${mostRecentFile.name}`
        const signedUrl = await getSignedUrl("customer-picture", path, 604800)
        setTreatmentConsentPath(path)
        setTreatmentConsentUrl(signedUrl)
        setTreatmentConsentUploaded(true)
      } else {
        setTreatmentConsentPath("")
        setTreatmentConsentUrl("")
        setTreatmentConsentUploaded(false)
      }
    } catch (err) {
      console.warn("Failed to load treatment consent form:", err)
      setTreatmentConsentPath("")
      setTreatmentConsentUrl("")
      setTreatmentConsentUploaded(false)
    }
  }

  const handleTreatmentPhotoUpload = async (file: File, photoType: 'before' | 'after' | 'other') => {
    if (!selectedAppointment) return
    
    setTreatmentGalleryError("")
    setTreatmentGalleryUploading(true)
    try {
      const processed = await convertToWebP(file, { maxWidth: 2000, maxHeight: 2000, quality: 0.85 })
      const timestamp = Date.now()
      const filename = `${selectedAppointment.id}_${photoType}_${timestamp}.webp`
      const path = `customer-gallery/${selectedAppointment.customer_id}/appointment-${selectedAppointment.id}/${filename}`
      
      const uploadResult = await uploadToSupabase("customer-picture", path, processed.blob)
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed")
      }

      await loadTreatmentPhotos(selectedAppointment.id, selectedAppointment.customer_id)
    } catch (err) {
      console.error("Error uploading treatment photo:", err)
      setTreatmentGalleryError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setTreatmentGalleryUploading(false)
    }
  }

  const handleTreatmentConsentFormUpload = async (file: File) => {
    if (!selectedAppointment) return
    
    setTreatmentConsentError("")
    setTreatmentConsentUploading(true)
    try {
      const processed = await convertToWebP(file, { maxWidth: 2000, maxHeight: 2000, quality: 0.85 })
      const timestamp = Date.now()
      const filename = `${selectedAppointment.id}_consent_${timestamp}.webp`
      const path = `customer-treatment-consents/${selectedAppointment.customer_id}/appointment-${selectedAppointment.id}/${filename}`
      
      const uploadResult = await uploadToSupabase("customer-picture", path, processed.blob)
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed")
      }

      await loadTreatmentConsentForm(selectedAppointment.id, selectedAppointment.customer_id)
      setTreatmentConsentError("")
    } catch (err) {
      console.error("Error uploading treatment consent form:", err)
      setTreatmentConsentError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setTreatmentConsentUploading(false)
    }
  }

  const handleDeleteTreatmentPhoto = async (photo: { id: string; path: string; url: string; type: 'before' | 'after' | 'other' }) => {
    try {
      const { error } = await supabase.storage
        .from("customer-picture")
        .remove([photo.path])
      
      if (error) throw error
      
      setTreatmentPhotos(prev => prev.filter(p => p.id !== photo.id))
    } catch (err) {
      console.error("Error deleting treatment photo:", err)
      setTreatmentGalleryError("Failed to delete photo")
    }
  }

  const handleDeleteTreatmentConsentForm = async () => {
    if (!treatmentConsentPath) return
    
    setTreatmentConsentError("")
    try {
      const { error } = await supabase.storage
        .from("customer-picture")
        .remove([treatmentConsentPath])
      
      if (error) throw error
      
      setTreatmentConsentPath("")
      setTreatmentConsentUrl("")
      setTreatmentConsentUploaded(false)
      setTreatmentConsentError("")
    } catch (err) {
      console.error("Error deleting treatment consent form:", err)
      setTreatmentConsentError(err instanceof Error ? err.message : "Failed to delete consent form")
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
    if (branchFilter) {
      filtered = filtered.filter((c) => c.branch_id === branchFilter)
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
    }

    // sorting
    if (sortMetric) {
      filtered.sort((a, b) => {
        let aVal = 0,
          bVal = 0
        if (sortMetric === "points") {
          aVal = a.points || 0
          bVal = b.points || 0
        } else if (sortMetric === "visits") {
          aVal = a.visits || 0
          bVal = b.visits || 0
        }
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal
      })
    } else {
      // default: sort by status then by recent creation date
      filtered.sort((a, b) => {
        const rankDiff = statusRank(a) - statusRank(b)
        if (rankDiff !== 0) return rankDiff
        return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
      })
    }

    setFilteredCustomers(filtered)
  }, [searchQuery, skinTypeFilter, genderFilter, statusFilter, sortMetric, sortOrder, branchFilter, customers])

  const hasActiveFilters = Boolean(skinTypeFilter || genderFilter || statusFilter || sortMetric || branchFilter)

  const clearFilters = () => {
    setSearchQuery("")
    setSkinTypeFilter("")
    setGenderFilter("")
    setStatusFilter("")
    setSortMetric("")
    setSortOrder("desc")
    setBranchFilter("")
  }

  // Filter customers whenever state changes
  useEffect(() => {
    filterCustomers()
    setCurrentPage(1)
  }, [filterCustomers])

  // open the customer modal when arriving from the NFC scanner page
  useEffect(() => {
    const state = location.state as {
      customer?: Customer
      fromNfc?: boolean
      fromAppointment?: boolean
      pointsAdded?: number
    } | null
    if (!state?.customer) return

    // When navigating from the calendar (appointment), we may only have a partial
    // customer object (id + name). In that case, fetch the full customer record so
    // the customer modal shows all fields.
    const loadCustomer = async () => {
      let customer = customers.find((c) => c.id === state.customer?.id) || state.customer

      const shouldFetchFullCustomer =
        state.fromAppointment ||
        !customer?.first_name ||
        !customer?.last_name ||
        !customer?.email

      if (shouldFetchFullCustomer && state.customer?.id) {
        try {
          const { data, error } = await supabase
            .from("customers")
            .select("*")
            .eq("id", state.customer.id)
            .single()
          if (!error && data) {
            customer = data as Customer
            setCustomers((prev) => {
              const found = prev.find((c) => c.id === data.id)
              if (found) return prev.map((c) => (c.id === data.id ? data : c))
              return [data, ...prev]
            })
          }
        } catch (err) {
          console.error("Failed to load customer for profile navigation:", err)
        }
      }

      setSelectedCustomer((customer as Customer) || null)
      setModalView("details")
      if (state.fromNfc) {
        setCameFromNfc(true)
      }
      if (state.pointsAdded) {
        // Refresh the list if points were added
        fetchCustomers()
      }

      // Clear state so we don't re-open the modal on future navigations.
      navigate("/dashboard/customers", { replace: true })
    }

    loadCustomer()
  }, [location.state, customers, navigate])

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

  const appointmentGroups = useMemo(() => {
    if (!selectedCustomer) return []
    const customerAppts = appointments.filter((a) => a.customer_id === selectedCustomer.id)
    const displayAppts = customerAppts
      .filter((a) => a.recurrence_group_id || a.status !== "cancelled")
      .flatMap((a) => {
        if (a.service_ids && a.service_ids.length > 1) {
          return a.service_ids.map((sid) => ({
            ...a,
            virtualServiceId: sid,
            title: serviceMap.get(sid)?.name || a.title,
            service_ids: [sid],
          }))
        }
        return [a]
      })

    const grouped = displayAppts.reduce((acc, a) => {
      const keyBase = a.recurrence_group_id || a.id
      const svcSuffix = (a as any).virtualServiceId || a.service_ids?.[0] || ""
      const key = `${keyBase}:${svcSuffix}`
      if (!acc[key]) {
        acc[key] = {
          id: key,
          isPackage: !!a.recurrence_group_id,
          sessions: [a],
          primaryAppointment: a,
        };
      } else {
        acc[key].sessions.push(a);
      }
      return acc;
    }, {} as Record<string, { id: string; isPackage: boolean; sessions: typeof displayAppts; primaryAppointment: (typeof displayAppts)[0] }>);

    const groupList = Object.values(grouped).map(g => {
      g.sessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      g.primaryAppointment = g.sessions[0];
      return g;
    });

    groupList.sort((a, b) => new Date(b.primaryAppointment.start_time).getTime() - new Date(a.primaryAppointment.start_time).getTime());
    return groupList
  }, [appointments, selectedCustomer, serviceMap])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { title: "Total Clients", value: totalClientsCount, icon: <Users className="h-5 w-5" /> },
          { title: "Total Points Issued", value: totalPointsCount, icon: <Award className="h-5 w-5" /> },
          { title: "Total Visits", value: totalVisitsCount, icon: <Calendar className="h-5 w-5" /> },
          { title: "Registered Cards", value: registeredCardsCount, icon: <CreditCard className="h-5 w-5" /> }
        ].map((stat, idx) => (
          <div key={idx} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-700/5 p-6 border border-amber-500/20 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-amber-500/10 hover:-translate-y-1">
            <div className="absolute -right-6 -top-6 rounded-full bg-amber-500/10 p-12 transition-transform duration-500 group-hover:scale-125"></div>
            <div className="relative z-10 flex flex-row items-center justify-between mb-4">
              <span className="text-sm font-semibold tracking-tight text-amber-900/70 dark:text-amber-100/70">{stat.title}</span>
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-2 text-amber-600 dark:text-amber-400 shadow-sm">
                {stat.icon}
              </div>
            </div>
            <div className="relative z-10 text-3xl font-bold text-foreground">
              {stat.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-amber-500" />
          <Input
            placeholder="Search by name, email, phone, or NFC ID..."
            className="pl-12 h-12 rounded-full border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-background focus-visible:ring-amber-500/50 focus-visible:border-amber-500 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant={showFilters ? "default" : "outline"} 
          className={`h-12 rounded-full px-6 transition-all shadow-sm ${showFilters ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'hover:border-amber-500 hover:text-amber-600'}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${showFilters ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'}`}>Active</span>
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
                  "Branch",
                  branchFilter,
                  setBranchFilter,
                  [
                    { label: "All Branches", value: "" },
                    ...branches.map((branch) => ({
                      label: branch.name,
                      value: branch.id,
                    })),
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

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
            <div>Showing {paginatedCustomers.length} of {filteredCustomers.length} clients</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/scan", { state: { mode: "register" } })}
            >
              Add New Customer
            </Button>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
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
                              "border-b transition-all duration-200 hover:bg-amber-500/5 cursor-pointer" +
                              ((isArchivedClient(customer) || isInactiveClient(customer)) ? " opacity-50" : "") +
                              (isArchivedClient(customer) ? " italic" : "")
                            }
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shadow-sm ring-1 ring-amber-200/50">
                                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
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
                              <span className="font-semibold text-amber-600 dark:text-amber-400">{customer.points || 0}</span>
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
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 border-b">
            <DialogTitle className="text-2xl">
              {selectedCustomer?.name || `${selectedCustomer?.first_name || ''} ${selectedCustomer?.middle_name || ''} ${selectedCustomer?.last_name || ''}`.trim()}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Client since {formatDate(selectedCustomer?.created_at)}</p>
          </DialogHeader>

          <div className="flex h-[calc(90vh-5.25rem)] bg-background">
            <div className="hidden md:flex w-64 shrink-0 flex-col gap-2 border-r bg-muted/10 p-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Quick Actions</h4>
              <Button
                variant={modalView === "details" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setModalView("details")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Details
              </Button>
              <Button
                variant={modalView === "appointments" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setModalView("appointments")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Appointments
              </Button>
              <Button
                variant={modalView === "treatments" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setModalView("treatments")}
              >
                <Award className="mr-2 h-4 w-4" />
                Treatment History
              </Button>
              <Button
                variant={modalView === "loyalty" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setModalView("loyalty")}
              >
                <Award className="mr-2 h-4 w-4" />
                Rewards & Points
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
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => openProfileEditor(selectedCustomer)}
              >
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
                    <Card className="group relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-700/5 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-amber-500/10">
                      <div className="absolute -right-4 -top-4 rounded-full bg-amber-500/10 p-8 transition-transform duration-500 group-hover:scale-125"></div>
                      <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm tracking-tight font-medium text-amber-900/70 dark:text-amber-100/70">Total Points</p>
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{selectedCustomer?.points || 0}</p>
                          </div>
                          <Award className="h-10 w-10 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="group relative overflow-hidden border-zinc-500/20 bg-gradient-to-br from-zinc-500/10 to-zinc-700/5 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-zinc-500/10">
                      <div className="absolute -right-4 -top-4 rounded-full bg-zinc-500/10 p-8 transition-transform duration-500 group-hover:scale-125"></div>
                      <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm tracking-tight font-medium text-zinc-500">Total Visits</p>
                            <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300">{selectedCustomer?.visits || 0}</p>
                          </div>
                          <Calendar className="h-10 w-10 text-zinc-500 dark:text-zinc-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4 text-amber-500" />
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
                      <Users className="h-4 w-4 text-amber-500" />
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
                    <div className="space-y-3">
                      <h4 className="text-base font-semibold text-destructive">Allergies</h4>
                      <div className="rounded-lg border bg-destructive/10 border-destructive/30 dark:bg-destructive/20 dark:border-destructive/40 p-4">
                        <p className="text-sm text-destructive/80 font-medium whitespace-pre-wrap">
                          {selectedCustomer.allergies}
                        </p>
                      </div>
                    </div>
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
              ) : modalView === "loyalty" ? (
                <> {/* Loyalty tab view */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold flex items-center gap-2">
                      <Award className="h-6 w-6 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      Loyalty Points & Rewards
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="group relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-700/5 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-amber-500/10">
                        <div className="absolute -right-4 -top-4 rounded-full bg-amber-500/10 p-12 transition-transform duration-500 group-hover:scale-125"></div>
                        <CardContent className="p-6 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1" aria-live="polite" aria-atomic="true">
                              <p className="text-sm font-semibold tracking-tight text-amber-900/70 dark:text-amber-100/70">Available Points</p>
                              <p className="text-5xl font-bold text-amber-600 dark:text-amber-500">{selectedCustomer?.points || 0}</p>
                            </div>

                            <Award className="h-16 w-16 text-amber-500/30" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="group relative overflow-hidden border-zinc-500/20 bg-gradient-to-br from-zinc-500/10 to-zinc-700/5 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-zinc-500/10">
                        <div className="absolute -right-4 -top-4 rounded-full bg-zinc-500/10 p-12 transition-transform duration-500 group-hover:scale-125"></div>
                        <CardContent className="p-6 text-center flex flex-col items-center justify-center relative z-10 h-full">
                          <p className="text-sm font-semibold tracking-tight text-zinc-500 mb-1">Total Visits</p>
                          <p className="text-4xl font-bold text-zinc-700 dark:text-zinc-300">{selectedCustomer?.visits || 0}</p>
                          <p className="text-xs text-zinc-500 mt-2 font-medium">Client since {formatDate(selectedCustomer?.created_at)}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <CustomerPointsDashboard
                        customerId={selectedCustomer?.id || ''}
                        isUpdating={isUpdating}
                        currentPoints={selectedCustomer?.points || 0}
                        showHistory={showPointsHistory}
                        onRedeemReward={redeemReward}
                        onEarnPoints={earnPoints}
                        onToggleHistory={() => setShowPointsHistory(!showPointsHistory)}
                      />
                      
                      {showPointsHistory && selectedCustomer && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                             <Clock className="h-4 w-4" />
                             Transaction History
                          </h5>
                          <PointsHistory customerId={selectedCustomer.id} refreshKey={historyRefreshKey} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalView === "appointments" ? (
                <> {/* appointments view */}
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
                            {(() => {
                              const openTreatmentDocForGroup = (g: { sessions: any[]; isPackage: boolean; primaryAppointment: any }) => {
                                const a = g.primaryAppointment
                                if (a.customer_id && a.id) {
                                  setSelectedAppointment(a)
                                  setSelectedAppointmentGroup(g)
                                  setUploadSectionOpen({
                                    beforeAfter: false,
                                    forms: false,
                                    miscellaneous: false,
                                  })
                                  setTreatmentPhotos([])
                                  setTreatmentConsentUrl("")
                                  setTreatmentConsentUploaded(false)
                                  setTreatmentConsentPath("")
                                  loadTreatmentPhotos(a.id, a.customer_id)
                                  loadTreatmentConsentForm(a.id, a.customer_id)
                                  setTreatmentDocModalOpen(true)
                                }
                              }

                              return appointmentGroups.map((g) => {
                                const a = g.primaryAppointment
                                const totalSessions = g.sessions.length
                                const completedCount = g.sessions.filter((s) => s.status === "completed").length
                                const remainingCount = totalSessions - completedCount

                                const isPackage = g.isPackage
                                const isPackageFinished =
                                  isPackage &&
                                  g.sessions.every((s) => s.status === "completed" || s.status === "cancelled")
                                const statusVariant = isPackage
                                  ? isPackageFinished
                                    ? "success"
                                    : "warning"
                                  : getAppointmentStatusVariant(a.status)
                                const statusLabel = isPackage
                                  ? isPackageFinished
                                    ? "Completed"
                                    : "In progress"
                                  : a.status
                                  ? a.status.replace("-", " ")
                                  : "Unknown"

                                return (
                                  <ContextMenu key={g.id}>
                                    <ContextMenuTrigger asChild>
                                      <Card
                                        className="py-0 gap-0 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary hover:border-l-primary/80"
                                        onClick={() => openTreatmentDocForGroup(g)}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                              <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm">
                                                  {a.title}
                                                </p>
                                                <Badge variant={statusVariant} className="capitalize">
                                                  {statusLabel}
                                                </Badge>
                                              </div>
                                              {g.isPackage && (
                                                <p className="text-xs text-muted-foreground">
                                                  Package: {totalSessions} sessions • {completedCount} done • {remainingCount} left
                                                </p>
                                              )}
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
                                            <div className="text-right space-y-1 flex-shrink-0 ml-4">
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
                                              {g.isPackage && g.sessions.length > 1 && (
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                  Last session: {new Date(g.sessions[g.sessions.length - 1].start_time).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                  })}
                                                </p>
                                              )}
                                            </div>
                                            <div className="ml-4 flex-shrink-0">
                                              <FileText className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                          </div>
                                          {a.notes && (
                                            <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                              {a.notes}
                                            </p>
                                          )}
                                        </CardContent>
                                      </Card>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem onSelect={() => openTreatmentDocForGroup(g)}>
                                        Open
                                      </ContextMenuItem>
                                      <ContextMenuItem
                                        onSelect={() => {
                                          setTreatmentDocModalOpen(false)
                                          setTimeout(() => {
                                            // Ensure any radix overlays are removed before navigation
                                            document
                                              .querySelectorAll(
                                                "[data-radix-dialog-overlay], [data-radix-context-menu-overlay], [data-radix-popover-overlay], [data-radix-dropdown-menu-overlay]",
                                              )
                                              .forEach((el) => el.remove())

                                            navigate("/dashboard/appointments", {
                                              state: { appointmentId: a.id },
                                            })
                                          }, 0)
                                        }}
                                      >
                                        Edit appointment
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                )
                              })

                            })()}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : modalView === "treatments" ? (
                <> {/* treatments tab view */}
                  {selectedCustomer && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold">Active Treatments</h4>
                        {(() => {
                           const activePackages = appointmentGroups.filter(g => g.isPackage && !g.sessions.every(s => s.status === "completed" || s.status === "cancelled"))
                           if (activePackages.length === 0) return <p className="text-sm text-muted-foreground">No active treatments found.</p>
                           
                           return activePackages.map(g => {
                             const totalSessions = g.sessions.length
                             const completedCount = g.sessions.filter((s) => s.status === "completed").length
                             const title = g.primaryAppointment.title

                             return (
                               <div key={g.id} className="flex flex-col gap-1 p-3 rounded-lg border bg-card/50">
                                 <div className="flex justify-between items-center">
                                   <span className="font-medium">{title}</span>
                                   <span className="text-sm text-muted-foreground">{completedCount} / {totalSessions} completed</span>
                                 </div>
                                 <div className="w-full bg-muted rounded-full h-2 mt-1">
                                   <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(completedCount / totalSessions) * 100}%` }}></div>
                                 </div>
                               </div>
                             )
                           })
                        })()}

                        <h4 className="text-lg font-semibold mt-6">Completed Treatments</h4>
                        {(() => {
                           const completedPackages = appointmentGroups.filter(g => g.isPackage && g.sessions.length > 0 && g.sessions.every(s => s.status === "completed" || s.status === "cancelled"))
                           if (completedPackages.length === 0) return <p className="text-sm text-muted-foreground">No completed treatments found.</p>

                           return completedPackages.map(g => {
                             const totalSessions = g.sessions.length
                             const completedCount = g.sessions.filter((s) => s.status === "completed").length
                             const title = g.primaryAppointment.title

                             return (
                               <div key={g.id} className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/40 opacity-70">
                                 <div className="flex justify-between items-center">
                                   <span className="font-medium line-through">{title}</span>
                                   <span className="text-sm text-muted-foreground">{completedCount} / {totalSessions} completed</span>
                                 </div>
                               </div>
                             )
                           })
                        })()}
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-lg font-semibold mb-3">Treatment History Log</h4>
                        <TreatmentHistory customerId={selectedCustomer.id} refreshKey={historyRefreshKey} />
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              <div className="space-y-3 pb-2 md:hidden">
                <Separator />
                <h4 className="text-base font-semibold">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant={modalView === "details" ? "default" : "outline"}
                    onClick={() => setModalView("details")}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Details
                  </Button>
                  <Button
                    variant={modalView === "appointments" ? "default" : "outline"}
                    onClick={() => setModalView("appointments")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Appointments
                  </Button>
                  <Button
                    variant={modalView === "treatments" ? "default" : "outline"}
                    onClick={() => setModalView("treatments")}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Treatment History
                  </Button>
                  <Button
                    variant={modalView === "loyalty" ? "default" : "outline"}
                    onClick={() => setModalView("loyalty")}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Rewards
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
                  <Button variant="outline" onClick={() => openProfileEditor(selectedCustomer)}>
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

      <Dialog open={profileEditorOpen} onOpenChange={setProfileEditorOpen}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update the selected customer's profile information.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 h-full min-h-0 px-6 py-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
              <Input
                id="first_name"
                value={profileForm.first_name}
                autoComplete="given-name"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="middle_name" className="text-sm font-medium">Middle Name</label>
              <Input
                id="middle_name"
                value={profileForm.middle_name}
                autoComplete="additional-name"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, middle_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium">Last Name <span className="text-destructive">*</span></label>
              <Input
                id="last_name"
                value={profileForm.last_name}
                autoComplete="family-name"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                autoComplete="email"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone</label>
              <Input
                id="phone"
                value={profileForm.phone}
                autoComplete="tel"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label id="label-dob" className="text-sm font-medium">Date of Birth</label>
              <DatePicker
                value={profileForm.date_of_birth ? new Date(profileForm.date_of_birth) : undefined}
                onChange={(date) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    date_of_birth: date ? date.toISOString().slice(0, 10) : "",
                  }))
                }
                captionLayout="dropdown"
                enableManualInput
                aria-labelledby="label-dob"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="gender" className="text-sm font-medium">Gender</label>
              <Input
                id="gender"
                value={profileForm.gender}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="skin_type" className="text-sm font-medium">Skin Type</label>
              <Input
                id="skin_type"
                value={profileForm.skin_type}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, skin_type: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="address" className="text-sm font-medium">Address</label>
              <Input
                id="address"
                value={profileForm.address}
                autoComplete="street-address"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="emergency_contact" className="text-sm font-medium">Emergency Contact</label>
              <Input
                id="emergency_contact"
                value={profileForm.emergency_contact}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergency_contact: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="nfc_uid" className="text-sm font-medium">NFC Card</label>
              <Input
                id="nfc_uid"
                value={selectedCustomer?.nfc_uid || ""}
                readOnly
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="allergies" className="text-sm font-medium">Allergies</label>
              <Textarea
                id="allergies"
                rows={3}
                value={profileForm.allergies}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, allergies: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="notes" className="text-sm font-medium">Notes</label>
              <Textarea
                id="notes"
                rows={4}
                value={profileForm.notes}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

          </div>
        </ScrollArea>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setScanMessage(null)
              setReassignPrompt(null)
              setAssignNfcModalOpen(true)
              setProfileEditorOpen(false)
              setShouldReopenProfileEditor(true)
            }}
            disabled={savingProfile}
          >
            Tag New Card
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setProfileEditorOpen(false)} disabled={savingProfile}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      <Dialog open={assignNfcModalOpen} onOpenChange={setAssignNfcModalOpen}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle>Tag New NFC Card</DialogTitle>
                <DialogDescription>
                  Scan a new NFC card to assign it to this customer.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignNfcModalOpen(false)
                  setReassignPrompt(null)
                  setIsAssigningNfc(false)
                  if (shouldReopenProfileEditor) {
                    setProfileEditorOpen(true)
                    setShouldReopenProfileEditor(false)
                  }
                }}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-6">
            {scanMessage && (
              <div className="sticky top-0 z-10 w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="font-medium text-destructive">Card already assigned</p>
                <p className="text-sm text-destructive/80 mt-2">{scanMessage}</p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setScanMessage(null)}
                    disabled={isAssigningNfc}
                  >
                    Scan another card
                  </Button>
                </div>
              </div>
            )}
            {assignSuccessMessage && (
              <div className="sticky top-0 z-10 w-full max-w-md rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-medium text-emerald-700">Card assigned</p>
                <p className="text-sm text-emerald-700 mt-2">{assignSuccessMessage}</p>
              </div>
            )}

            <div className="w-full max-w-md">
              <NFCScanner
                onCustomerFound={(cardCustomer) => {
                  if (!selectedCustomer) return
                  handleAssignNfcCard(cardCustomer.nfc_uid)
                }}
                onNewCard={(uid) => handleAssignNfcCard(uid)}
              />
            </div>

            {isAssigningNfc && (
              <p className="mt-4 text-sm text-muted-foreground">Assigning card…</p>
            )}
            {reassignPrompt && (
              <div className="sticky top-0 z-10 w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="font-medium text-destructive">Card already assigned</p>
                <p className="text-sm text-destructive/80 mt-2">
                  This card is currently assigned to <span className="font-semibold">{reassignPrompt.ownerName}</span>.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelReassign}
                    disabled={isAssigningNfc}
                  >
                    Scan another card
                  </Button>
                  <Button
                    onClick={handleConfirmReassign}
                    disabled={isAssigningNfc}
                  >
                    Reassign to this customer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Treatment Documentation Modal */}
      <Dialog open={treatmentDocModalOpen} onOpenChange={setTreatmentDocModalOpen}>
        <DialogContent className="max-w-3xl h-[90vh] min-h-0 flex flex-col p-0">
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Treatment Documentation - {selectedAppointment?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedAppointment?.treatment_name && `Treatment: ${selectedAppointment.treatment_name}`}
                {selectedAppointment?.start_time && (
                  <span className="block text-sm text-muted-foreground">
                    <span className="block">
                      {new Date(selectedAppointment.start_time).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs block">
                      {new Date(selectedAppointment.start_time).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea
            className="flex-1 h-full min-h-0 w-full pr-3 overflow-auto scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="space-y-6 px-6 py-4">
              {/* Hidden file inputs */}
              <input
                id="treatment-before-input"
                type="file"
                accept="image/*"
                title="Upload before photo"
                aria-label="Upload before photo"
                className="hidden"
                disabled={treatmentGalleryUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleTreatmentPhotoUpload(file, 'before')
                  }
                  e.currentTarget.value = ''
                }}
              />
              <input
                id="treatment-after-input"
                type="file"
                accept="image/*"
                title="Upload after photo"
                aria-label="Upload after photo"
                className="hidden"
                disabled={treatmentGalleryUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleTreatmentPhotoUpload(file, 'after')
                  }
                  e.currentTarget.value = ''
                }}
              />
              <input
                id="treatment-other-input"
                type="file"
                accept="image/*"
                title="Upload other photo"
                aria-label="Upload other photo"
                className="hidden"
                disabled={treatmentGalleryUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleTreatmentPhotoUpload(file, 'other')
                  }
                  e.currentTarget.value = ''
                }}
              />
              <input
                id="treatment-consent-form-input"
                type="file"
                accept="image/*"
                title="Upload consent form"
                aria-label="Upload consent form"
                className="hidden"
                disabled={treatmentConsentUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleTreatmentConsentFormUpload(file)
                  }
                  e.currentTarget.value = ''
                }}
              />

              {/* Error Messages */}
              {treatmentGalleryError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{treatmentGalleryError}</p>
                </div>
              )}
              {treatmentConsentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{treatmentConsentError}</p>
                </div>
              )}

              {/* Treatment session summary (for packages) */}
              {treatmentGroupIsPackage && treatmentGroupTotalSessions > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Package history</p>
                      <p className="text-xs text-muted-foreground">
                        {treatmentGroupCompletedSessions} of {treatmentGroupTotalSessions} sessions completed • {treatmentGroupRemainingSessions} remaining
                      </p>
                    </div>
                    <Badge 
                      variant={treatmentGroupCompletedSessions === treatmentGroupTotalSessions ? "success" : "warning"} 
                      className="capitalize"
                    >
                      {treatmentGroupCompletedSessions === treatmentGroupTotalSessions
                        ? "Complete"
                        : "In progress"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    {treatmentGroupSessionsSorted.map((s) => (
                      <ContextMenu key={s.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            title="Right click for options"
                            className="cursor-context-menu grid grid-cols-[1fr_auto] gap-3 rounded-lg border px-3 py-2 bg-background hover:bg-muted/30 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium">
                                    {new Date(s.start_time).toLocaleDateString(undefined, {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(s.start_time).toLocaleTimeString(undefined, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                <Badge variant={getAppointmentStatusVariant(s.status)} className="capitalize">
                                  {s.status?.replace("-", " ") || "Unknown"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {s.notes ? s.notes : "No notes"}
                              </p>
                            </div>

                            <div className="flex items-start justify-end gap-2">
                              {s.status === "cancelled" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRescheduleAppointment(s)}
                                >
                                  Reschedule
                                </Button>
                              )}
                            </div>
                          </div>
                        </ContextMenuTrigger>

                        <ContextMenuContent>
                          <ContextMenuItem
                            onSelect={() => {
                              setTreatmentDocModalOpen(false)
                              setTimeout(() => {
                                document
                                  .querySelectorAll(
                                    "[data-radix-dialog-overlay], [data-radix-context-menu-overlay], [data-radix-popover-overlay], [data-radix-dropdown-menu-overlay]",
                                  )
                                  .forEach((el) => el.remove())

                                navigate("/dashboard/appointments", {
                                  state: { appointmentId: s.id },
                                })
                              }, 0)
                            }}
                          >
                            Edit appointment
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload sections (collapsible) */}
              <div className="space-y-4">
                {/* Before & After */}
                <div className="rounded-lg border bg-muted/10">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-4 py-3"
                    onClick={() =>
                      setUploadSectionOpen((prev) => ({
                        ...prev,
                        beforeAfter: !prev.beforeAfter,
                      }))
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Before &amp; After</p>
                        <p className="text-xs text-muted-foreground">
                          Upload photos from the treatment session.
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition ${
                        uploadSectionOpen.beforeAfter ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {uploadSectionOpen.beforeAfter && (
                    <div className="border-t px-4 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {['before', 'after'].map((type) => {
                          const photos = treatmentPhotos.filter((p) => p.type === type)
                          const label = type === 'before' ? 'Before' : 'After'
                          return (
                            <div key={type} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{label}</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    document
                                      .getElementById(`treatment-${type}-input`)
                                      ?.click()
                                  }
                                  disabled={treatmentGalleryUploading}
                                >
                                  Upload
                                </Button>
                              </div>
                              {photos.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                  {photos.map((photo) => (
                                    <div
                                      key={photo.id}
                                      className="relative overflow-hidden rounded-xl border bg-muted"
                                    >
                                      <button
                                        type="button"
                                        className="absolute inset-0"
                                        onClick={() => setEnlargedImage(photo.url)}
                                      />
                                      <img
                                        src={photo.url}
                                        alt={type}
                                        className="h-24 w-full object-cover"
                                      />
                                      <div className="absolute bottom-1 right-1 flex gap-1">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          onClick={() =>
                                            downloadImageAsJpeg(photo.url, `${type}-photo`)
                                          }
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          onClick={() => handleDeleteTreatmentPhoto(photo)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No photos added yet.</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Consent Form */}
                <div className="rounded-lg border bg-muted/10">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-4 py-3"
                    onClick={() =>
                      setUploadSectionOpen((prev) => ({
                        ...prev,
                        forms: !prev.forms,
                      }))
                    }
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Consent Form</p>
                        <p className="text-xs text-muted-foreground">
                          Upload a signed consent form or treatment notes.
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition ${
                        uploadSectionOpen.forms ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {uploadSectionOpen.forms && (
                    <div className="border-t px-4 py-4">
                      {treatmentConsentUploaded && treatmentConsentUrl ? (
                        <div className="flex flex-col gap-3">
                          <div className="relative overflow-hidden rounded-xl border bg-muted">
                            <button
                              type="button"
                              className="absolute inset-0"
                              onClick={() => setEnlargedImage(treatmentConsentUrl)}
                            />
                            <img
                              src={treatmentConsentUrl}
                              alt="Consent Form"
                              className="h-40 w-full object-cover"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadImageAsJpeg(treatmentConsentUrl, 'consent-form')}
                            >
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleDeleteTreatmentConsentForm}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">No consent form uploaded yet.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('treatment-consent-form-input')?.click()}
                            disabled={treatmentConsentUploading}
                          >
                            Upload
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Miscellaneous Photos */}
                <div className="rounded-lg border bg-muted/10">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-4 py-3"
                    onClick={() =>
                      setUploadSectionOpen((prev) => ({
                        ...prev,
                        miscellaneous: !prev.miscellaneous,
                      }))
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Miscellaneous</p>
                        <p className="text-xs text-muted-foreground">
                          Upload other reference images or notes.
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition ${
                        uploadSectionOpen.miscellaneous ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {uploadSectionOpen.miscellaneous && (
                    <div className="border-t px-4 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {treatmentPhotos
                          .filter((p) => p.type === 'other')
                          .map((photo) => (
                            <div
                              key={photo.id}
                              className="relative overflow-hidden rounded-xl border bg-muted"
                            >
                              <button
                                type="button"
                                className="absolute inset-0"
                                onClick={() => setEnlargedImage(photo.url)}
                              />
                              <img
                                src={photo.url}
                                alt="Misc"
                                className="h-24 w-full object-cover"
                              />
                              <div className="absolute bottom-1 right-1 flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() =>
                                    downloadImageAsJpeg(photo.url, `other-photo-${photo.id}`)
                                  }
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDeleteTreatmentPhoto(photo)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        <button
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground hover:border-primary hover:bg-primary/5"
                          onClick={() => document.getElementById('treatment-other-input')?.click()}
                          disabled={treatmentGalleryUploading}
                        >
                          <Plus className="h-5 w-5 text-primary" />
                          Add Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Enlarged Image Dialog */}
      <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center w-full h-full">
            {enlargedImage && (
              <img
                src={enlargedImage}
                alt="Enlarged preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAppointmentToEdit(null)
          }
          setAppointmentDialogOpen(open)
        }}
        appointment={appointmentToEdit}
        staff={staff}
        selectedDate={selectedDate}
        interval={interval}
        clinicHours={clinicHours}
        appointments={appointments}
        blockedTimes={[]}
        onSave={async (appointment) => {
          if (appointmentToEdit) {
            await updateAppointment(appointmentToEdit.id, appointment)
          } else {
            await addAppointment(appointment)

            // If this was a reward redemption, deduct points now
            if (pendingReward && prefillCustomer) {
              const newPoints = (prefillCustomer.points || 0) - pendingReward.points_required
              
              const { data: updatedCust, error: updateErr } = await supabase
                .from("customers")
                .update({ points: newPoints })
                .eq("id", prefillCustomer.id)
                .select()
                .single()
              
              if (!updateErr && updatedCust) {
                await supabase
                  .from("points_transactions")
                  .insert({
                    customer_id: prefillCustomer.id,
                    points_change: -pendingReward.points_required,
                    reason: `Redeemed: ${pendingReward.reward_name}`,
                    type: "redeem",
                    appointment_id: appointment.id,
                  })
                
                setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)))
              }
            }
          }

          setAppointmentDialogOpen(false)
          setAppointmentToEdit(null)
          setPrefillCustomer(null)
          setPrefillServiceIds([])
          setPendingReward(null)
        }}
        onDelete={(id) => deleteAppointment(id)}
        prefillCustomerId={prefillCustomer?.id}
        prefillCustomerName={prefillCustomer?.name || `${prefillCustomer?.first_name || ''} ${prefillCustomer?.last_name || ''}`.trim()}
        prefillServiceIds={prefillServiceIds}
      />
    </div>
  )
}
