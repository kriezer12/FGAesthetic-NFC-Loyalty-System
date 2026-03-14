import { useEffect, useMemo, useState, useCallback } from "react"
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
} from "lucide-react"
import { useCounter } from "@/hooks/use-counter"
import { useAuth } from "@/contexts/auth-context"
import { useStaff } from "@/hooks/use-staff"
import { useAppointments } from "@/hooks/use-appointments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CustomerPointsDashboard } from "@/components/features/customers/customer-info-parts/customer-points-dashboard"
import { PointsHistory } from "@/components/features/customers/customer-info-parts/points-history"
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
import type { IntervalMinutes } from "@/types/appointment"
import type { Service } from "@/types/service"
import { DEFAULT_INTERVAL } from "@/components/features/calendar/calendar-parts/calendar-config"

export default function CustomersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile } = useAuth()

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
  const [modalView, setModalView] = useState<"details" | "treatments" | "loyalty">("details")
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
  const [showPointsHistory, setShowPointsHistory] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

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
  const [prefillServiceIds, setPrefillServiceIds] = useState<string[]>([])
  const [pendingReward, setPendingReward] = useState<LoyaltyReward | null>(null)
  const { staff = [] } = useStaff()
  
  // Treatment documentation state
  const [treatmentDocModalOpen, setTreatmentDocModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [treatmentPhotos, setTreatmentPhotos] = useState<Array<{ id: string; path: string; url: string; type: 'before' | 'after' }>>([])
  const [treatmentConsentPath, setTreatmentConsentPath] = useState<string>("")
  const [treatmentConsentUrl, setTreatmentConsentUrl] = useState<string>("")
  const [treatmentConsentUploaded, setTreatmentConsentUploaded] = useState(false)
  const [treatmentGalleryError, setTreatmentGalleryError] = useState("")
  const [treatmentConsentError, setTreatmentConsentError] = useState("")
  const [treatmentGalleryUploading, setTreatmentGalleryUploading] = useState(false)
  const [treatmentConsentUploading, setTreatmentConsentUploading] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  
  const { appointments, addAppointment } = useAppointments()
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
        .createSignedUrls(paths, 3600)

      const signedMap = new Map(
        (signedData ?? []).map((s) => [s.path ?? "", s.signedUrl ?? ""])
      )

      const photoList = photos.map(f => {
        const path = `customer-gallery/${customerId}/appointment-${appointmentId}/${f.name}`
        const { data: urlData } = supabase.storage
          .from("customer-picture")
          .getPublicUrl(path)
        return {
          id: f.name,
          path,
          url: signedMap.get(path) ?? urlData.publicUrl,
          type: f.name.includes('_before_') ? 'before' as const : 'after' as const
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
        const signedUrl = await getSignedUrl("customer-picture", path, 3600)
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

  const handleTreatmentPhotoUpload = async (file: File, photoType: 'before' | 'after') => {
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

  const handleDeleteTreatmentPhoto = async (photo: { id: string; path: string; url: string; type: 'before' | 'after' }) => {
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
  }, [searchQuery, skinTypeFilter, genderFilter, statusFilter, sortMetric, sortOrder, customers])

  const hasActiveFilters = Boolean(skinTypeFilter || genderFilter || statusFilter || sortMetric)

  const clearFilters = () => {
    setSearchQuery("")
    setSkinTypeFilter("")
    setGenderFilter("")
    setStatusFilter("")
    setSortMetric("")
    setSortOrder("desc")
  }

  // Filter customers whenever state changes
  useEffect(() => {
    filterCustomers()
    setCurrentPage(1)
  }, [filterCustomers])

  // open the customer modal when arriving from the NFC scanner page
  useEffect(() => {
    const state = location.state as { customer?: Customer; fromNfc?: boolean; pointsAdded?: number } | null
    if (!state?.fromNfc || !state.customer) return

    const customerFromList = customers.find((c) => c.id === state.customer?.id)
    setSelectedCustomer(customerFromList || state.customer)
    setModalView("details")
    setCameFromNfc(true)
    if (state.pointsAdded) {
      // Refresh the list if points were added
      fetchCustomers()
    }
    navigate("/dashboard/customers", { replace: true })
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

          <div className="flex h-[calc(90vh-5.25rem)]">
            <div className="hidden md:flex w-64 shrink-0 flex-col gap-2 border-r bg-muted/20 p-4">
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
                variant={modalView === "treatments" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setModalView("treatments")}
              >
                <Award className="mr-2 h-4 w-4" />
                Treatments
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
                    <div className="space-y-3">
                      <h4 className="text-base font-semibold text-red-600">⚠️ Allergies</h4>
                      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-700 font-medium">{selectedCustomer.allergies}</p>
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
                      <Award className="h-5 w-5 text-primary" />
                      Loyalty Points & Rewards
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Available Points</p>
                              <p className="text-4xl font-bold text-primary">{selectedCustomer?.points || 0}</p>
                            </div>
                            <Award className="h-12 w-12 text-primary opacity-50" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6 text-center flex flex-col items-center justify-center">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Total Visits</p>
                          <p className="text-2xl font-bold">{selectedCustomer?.visits || 0}</p>
                          <p className="text-xs text-muted-foreground mt-1">Client since {formatDate(selectedCustomer?.created_at)}</p>
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
              ) : modalView === "treatments" ? (
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
                            {(() => {
                              const customerAppts = appointments.filter((a) => a.customer_id === selectedCustomer?.id);

                              // split any single appointment that contains multiple services into separate "virtual" appts
                              const displayAppts = customerAppts.flatMap((a) => {
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

                              // Group by recurrence_group_id + service, or just appointment + service
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
                                // sort sessions ascending by date
                                g.sessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                                // set the primary to the first session, so docs are always stored against the first session's ID
                                g.primaryAppointment = g.sessions[0];
                                return g;
                              });

                              // Sort groups by the start time of their primary appointment (descending for history)
                              groupList.sort((a, b) => new Date(b.primaryAppointment.start_time).getTime() - new Date(a.primaryAppointment.start_time).getTime());

                              return groupList.map((g) => {
                                const a = g.primaryAppointment;
                                return (
                                  <Card 
                                    key={g.id} 
                                    className="py-0 gap-0 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary hover:border-l-primary/80"
                                    onClick={() => {
                                      if (a.customer_id && a.id) {
                                        setSelectedAppointment(a);
                                        setTreatmentPhotos([]);
                                        setTreatmentConsentUrl("");
                                        setTreatmentConsentUploaded(false);
                                        setTreatmentConsentPath("");
                                        loadTreatmentPhotos(a.id, a.customer_id);
                                        loadTreatmentConsentForm(a.id, a.customer_id);
                                        setTreatmentDocModalOpen(true);
                                      }
                                    }}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-1 flex-1">
                                          <p className="font-medium text-sm">
                                            {a.title} {g.isPackage && <span className="text-xs font-normal text-muted-foreground ml-2">(Package of {g.sessions.length} sessions)</span>}
                                          </p>
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
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : null}

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
                    variant={modalView === "treatments" ? "default" : "outline"}
                    onClick={() => setModalView("treatments")}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Treatments
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
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={profileForm.first_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Middle Name</label>
              <Input
                value={profileForm.middle_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, middle_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={profileForm.last_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={profileForm.phone}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
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
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gender</label>
              <Input
                value={profileForm.gender}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Skin Type</label>
              <Input
                value={profileForm.skin_type}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, skin_type: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={profileForm.address}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Emergency Contact</label>
              <Input
                value={profileForm.emergency_contact}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergency_contact: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Allergies</label>
              <Textarea
                rows={3}
                value={profileForm.allergies}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, allergies: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                rows={4}
                value={profileForm.notes}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setProfileEditorOpen(false)} disabled={savingProfile}>
            Cancel
          </Button>
          <Button onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
      </Dialog>

      {/* Treatment Documentation Modal */}
      <Dialog open={treatmentDocModalOpen} onOpenChange={setTreatmentDocModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Treatment Documentation - {selectedAppointment?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedAppointment?.treatment_name && `Treatment: ${selectedAppointment.treatment_name}`}
                {selectedAppointment?.start_time && (
                  <>, {new Date(selectedAppointment.start_time).toLocaleDateString()}</>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 w-full overflow-y-auto pr-3">
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

              {/* Gallery Display */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Before Photos Column */}
                  <div className="space-y-3">
                    <h6 className="text-sm font-semibold text-muted-foreground">Before</h6>
                  {treatmentPhotos.filter(p => p.type === 'before').length > 0 ? (
                    treatmentPhotos.filter(p => p.type === 'before').map((photo) => (
                      <div key={photo.id} className="rounded-xl border-2 overflow-hidden group relative hover:shadow-lg transition-shadow">
                        <div className="bg-muted aspect-square flex items-center justify-center relative cursor-pointer hover:opacity-90" onClick={() => setEnlargedImage(photo.url)}>
                          <img 
                            src={photo.url} 
                            alt={photo.type}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                        <div className="p-2 bg-background flex items-center justify-between border-t">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                              onClick={() => downloadImageAsJpeg(photo.url, `${photo.type}-photo`)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={() => handleDeleteTreatmentPhoto(photo)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <button
                      className="w-full aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={treatmentGalleryUploading}
                      onClick={() => document.getElementById('treatment-before-input')?.click()}
                    >
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Image className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xs font-semibold">Upload Before</p>
                    </button>
                  )}
                </div>

                {/* After Photos Column */}
                <div className="space-y-3">
                  <h6 className="text-sm font-semibold text-muted-foreground">After</h6>
                  {treatmentPhotos.filter(p => p.type === 'after').length > 0 ? (
                    treatmentPhotos.filter(p => p.type === 'after').map((photo) => (
                      <div key={photo.id} className="rounded-xl border-2 overflow-hidden group relative hover:shadow-lg transition-shadow">
                        <div className="bg-muted aspect-square flex items-center justify-center relative cursor-pointer hover:opacity-90" onClick={() => setEnlargedImage(photo.url)}>
                          <img 
                            src={photo.url} 
                            alt={photo.type}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                        <div className="p-2 bg-background flex items-center justify-between border-t">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                              onClick={() => downloadImageAsJpeg(photo.url, `${photo.type}-photo`)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={() => handleDeleteTreatmentPhoto(photo)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <button
                      className="w-full aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={treatmentGalleryUploading}
                      onClick={() => document.getElementById('treatment-after-input')?.click()}
                    >
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Image className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xs font-semibold">Upload After</p>
                    </button>
                  )}
                </div>
              </div>
            </div>

              {/* Consent Form Display */}
              <div className="space-y-3">
                <h6 className="text-sm font-semibold text-muted-foreground">Consent Form</h6>
                {treatmentConsentUploaded && treatmentConsentUrl ? (
                  <div className="rounded-xl border-2 overflow-hidden group relative hover:shadow-lg transition-shadow">
                    <div className="bg-muted aspect-video flex items-center justify-center cursor-pointer hover:opacity-90" onClick={() => setEnlargedImage(treatmentConsentUrl)}>
                      <img 
                        src={treatmentConsentUrl}
                        alt="Consent Form"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="p-2 bg-background flex items-center justify-between border-t">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                          onClick={() => downloadImageAsJpeg(treatmentConsentUrl, 'consent-form')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={handleDeleteTreatmentConsentForm}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full py-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={treatmentConsentUploading}
                    onClick={() => document.getElementById('treatment-consent-form-input')?.click()}
                  >
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold">Upload Consent Form</p>
                  </button>
                )}
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
        onOpenChange={setAppointmentDialogOpen}
        staff={staff}
        selectedDate={selectedDate}
        interval={interval}
        clinicHours={clinicHours}
        appointments={appointments}
        blockedTimes={[]}
        onSave={async (appointment) => {
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
                  appointment_id: appointment.id
                })
              
              setCustomers(prev => prev.map(c => c.id === updatedCust.id ? updatedCust : c))
            }
          }

          setAppointmentDialogOpen(false)
          setPrefillCustomer(null)
          setPrefillServiceIds([])
          setPendingReward(null)
        }}
        prefillCustomerId={prefillCustomer?.id}
        prefillCustomerName={prefillCustomer?.name || `${prefillCustomer?.first_name || ''} ${prefillCustomer?.last_name || ''}`.trim()}
        prefillServiceIds={prefillServiceIds}
      />
    </div>
  )
}
