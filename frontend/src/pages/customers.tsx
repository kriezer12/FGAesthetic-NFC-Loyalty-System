import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Image,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { useCounter } from "@/hooks/use-counter"
import { useAuth } from "@/contexts/auth-context"
import { useStaff } from "@/hooks/use-staff"
import { useAppointments } from "@/hooks/use-appointments"
import { useBranches } from "@/hooks/use-branches"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppointmentDialog } from "@/components/features/calendar/calendar-parts/appointment-dialog"
import { supabase } from "@/lib/supabase"
import { downloadImageAsJpeg } from "@/lib/image-utils"
import { logUserAction } from "@/lib/user-log"
import type { Customer } from "@/types/customer"
import type { Appointment, IntervalMinutes } from "@/types/appointment"
import type { Service } from "@/types/service"
import { DEFAULT_INTERVAL } from "@/components/features/calendar/calendar-parts/calendar-config"

// Refactored Components
import { CustomerMetrics } from "@/components/features/customers/customer-metrics"
import { CustomerFilters } from "@/components/features/customers/customer-filters"
import { CustomerList } from "@/components/features/customers/customer-list"
import { CustomerProfileEditor } from "@/components/features/customers/customer-profile-editor"
import { AssignNfcModal } from "@/components/features/customers/assign-nfc-modal"
import { TreatmentDocModal } from "@/components/features/customers/treatment-doc-modal"
import { CustomerDetailsModal } from "@/components/features/customers/customer-details-modal"

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
  const groupedAppointments = useMemo(() => {
    if (!selectedCustomer) return []
    const customerAppts = appointments.filter((a) => a.customer_id === selectedCustomer?.id)
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
        }
      } else {
        acc[key].sessions.push(a)
      }
      return acc
    }, {} as Record<string, any>)

    const groupList = Object.values(grouped).map((g: any) => {
      g.sessions.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      g.primaryAppointment = g.sessions[0]
      return g
    })

    groupList.sort((a: any, b: any) => new Date(b.primaryAppointment.start_time).getTime() - new Date(a.primaryAppointment.start_time).getTime())
    return groupList
  }, [appointments, selectedCustomer, serviceMap])

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
  }, [filterCustomers, searchQuery, skinTypeFilter, genderFilter, statusFilter, sortMetric, sortOrder, branchFilter])

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

  return (
    <div>
      <CustomerMetrics
        totalClientsCount={totalClientsCount}
        totalPointsCount={totalPointsCount}
        totalVisitsCount={totalVisitsCount}
        registeredCardsCount={registeredCardsCount}
      />

      <CustomerFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        hasActiveFilters={hasActiveFilters}
        skinTypeFilter={skinTypeFilter}
        setSkinTypeFilter={setSkinTypeFilter}
        genderFilter={genderFilter}
        setGenderFilter={setGenderFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        branchFilter={branchFilter}
        setBranchFilter={setBranchFilter}
        sortMetric={sortMetric}
        setSortMetric={setSortMetric}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        branches={branches}
        clearFilters={clearFilters}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground mt-6">
        <div>Showing {paginatedCustomers.length} of {filteredCustomers.length} clients</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/scan", { state: { mode: "register" } })}
        >
          Add New Customer
        </Button>
      </div>

      <CustomerList
        isLoading={isLoading}
        paginatedCustomers={paginatedCustomers}
        filteredCustomers={filteredCustomers}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        setSelectedCustomer={setSelectedCustomer}
        setPrefillCustomer={setPrefillCustomer}
        setAppointmentDialogOpen={setAppointmentDialogOpen}
        openProfileEditor={openProfileEditor}
        toggleArchive={toggleArchive}
        isArchivedClient={isArchivedClient}
        isInactiveClient={isInactiveClient}
        formatDate={formatDate}
      />

      <CustomerDetailsModal
        open={!!selectedCustomer && !profileEditorOpen}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
        customer={selectedCustomer}
        modalView={modalView}
        setModalView={setModalView}
        formatDate={formatDate}
        isInactiveClient={isInactiveClient}
        inactiveDate={inactiveDate}
        onBookAppointment={(cust) => {
          setPrefillCustomer(cust)
          setAppointmentDialogOpen(true)
          setSelectedCustomer(null)
        }}
        onEditProfile={(cust) => openProfileEditor(cust)}
        isUpdating={isUpdating}
        showPointsHistory={showPointsHistory}
        setShowPointsHistory={setShowPointsHistory}
        historyRefreshKey={historyRefreshKey}
        redeemReward={redeemReward}
        earnPoints={earnPoints}
        customerAppointments={groupedAppointments}
        getAppointmentStatusVariant={getAppointmentStatusVariant}
        onOpenTreatmentDoc={(appt) => {
          const group = groupedAppointments.find((g: any) => g.sessions.some((s: any) => s.id === appt.id))
          setSelectedAppointment(appt)
          setSelectedAppointmentGroup(group || { sessions: [appt], isPackage: false, primaryAppointment: appt })
          setUploadSectionOpen({
            beforeAfter: false,
            forms: false,
            miscellaneous: false,
          })
          setTreatmentPhotos([])
          setTreatmentConsentUrl("")
          setTreatmentConsentUploaded(false)
          setTreatmentConsentPath("")
          loadTreatmentPhotos(appt.id, appt.customer_id)
          loadTreatmentConsentForm(appt.id, appt.customer_id)
          setTreatmentDocModalOpen(true)
        }}
      />

      <CustomerProfileEditor
        open={profileEditorOpen}
        onOpenChange={setProfileEditorOpen}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        savingProfile={savingProfile}
        onSave={handleSaveProfile}
        selectedCustomer={selectedCustomer}
        setScanMessage={setScanMessage}
        setReassignPrompt={setReassignPrompt}
        setAssignNfcModalOpen={setAssignNfcModalOpen}
        setShouldReopenProfileEditor={setShouldReopenProfileEditor}
      />

      <AssignNfcModal
        open={assignNfcModalOpen}
        onOpenChange={setAssignNfcModalOpen}
        selectedCustomer={selectedCustomer}
        scanMessage={scanMessage}
        setScanMessage={setScanMessage}
        isAssigningNfc={isAssigningNfc}
        setIsAssigningNfc={setIsAssigningNfc}
        reassignPrompt={reassignPrompt}
        setReassignPrompt={setReassignPrompt}
        handleAssignNfcCard={handleAssignNfcCard}
        handleConfirmReassign={handleConfirmReassign}
        handleCancelReassign={handleCancelReassign}
        shouldReopenProfileEditor={shouldReopenProfileEditor}
        setProfileEditorOpen={setProfileEditorOpen}
        setShouldReopenProfileEditor={setShouldReopenProfileEditor}
        assignSuccessMessage={assignSuccessMessage}
      />

      <TreatmentDocModal
        open={treatmentDocModalOpen}
        onOpenChange={setTreatmentDocModalOpen}
        selectedAppointment={selectedAppointment}
        treatmentGalleryUploading={treatmentGalleryUploading}
        handleTreatmentPhotoUpload={handleTreatmentPhotoUpload}
        treatmentConsentUploading={treatmentConsentUploading}
        handleTreatmentConsentFormUpload={handleTreatmentConsentFormUpload}
        treatmentGalleryError={treatmentGalleryError}
        treatmentConsentError={treatmentConsentError}
        treatmentGroupIsPackage={treatmentGroupIsPackage}
        treatmentGroupTotalSessions={treatmentGroupTotalSessions}
        treatmentGroupCompletedSessions={treatmentGroupCompletedSessions}
        treatmentGroupRemainingSessions={treatmentGroupRemainingSessions}
        treatmentGroupSessionsSorted={treatmentGroupSessionsSorted}
        getAppointmentStatusVariant={getAppointmentStatusVariant}
        openRescheduleAppointment={openRescheduleAppointment}
        uploadSectionOpen={uploadSectionOpen}
        setUploadSectionOpen={setUploadSectionOpen}
        treatmentPhotos={treatmentPhotos}
        setEnlargedImage={setEnlargedImage}
        downloadImageAsJpeg={downloadImageAsJpeg}
        handleDeleteTreatmentPhoto={handleDeleteTreatmentPhoto}
        treatmentConsentUploaded={treatmentConsentUploaded}
        treatmentConsentUrl={treatmentConsentUrl}
        handleDeleteTreatmentConsentForm={handleDeleteTreatmentConsentForm}
        navigate={navigate}
      />

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
