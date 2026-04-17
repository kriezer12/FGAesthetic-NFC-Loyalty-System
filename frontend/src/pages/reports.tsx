import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import {
  ReportsHeader,
  ErrorBanner,
  ClientStatusCards,
  ExportSection,
  ArchivedClientsTable,
  TreatmentSummaryTable,
  StaffAppointmentsTable,
  EmptyState,
} from "@/components/features/reports"
import type { ClientCounts, ArchivedClient, TreatmentSummary, AppointmentStats } from "@/components/features/reports"

type ReportType = "full" | "clients" | "treatments" | "appointments"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

async function fetchWithErrorMsg<T>(endpoint: string, name: string): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`)
    if (!res.ok) {
      throw new Error(`${name} returned ${res.status}: ${res.statusText}`)
    }
    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Network error while fetching ${name}. Backend may not be running.`)
    }
    throw err
  }
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  useEffect(() => {
    if (
      !userProfile ||
      !["branch_admin", "super_admin"].includes(userProfile.role || "")
    ) {
      navigate("/dashboard")
    }
  }, [userProfile, navigate])

  const [clientCounts, setClientCounts] = useState<ClientCounts | null>(null)
  const [archivedClients, setArchivedClients] = useState<ArchivedClient[]>([])
  const [treatmentSummary, setTreatmentSummary] = useState<TreatmentSummary[]>([])
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReportData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log(`[Reports] Fetching from ${API_BASE}`)

      const [countsData, archivedData, treatmentData, appointmentData] = await Promise.all([
        fetchWithErrorMsg<ClientCounts>("/reports/clients/counts", "Client Counts"),
        fetchWithErrorMsg<ArchivedClient[]>("/reports/clients/archived", "Archived Clients"),
        fetchWithErrorMsg<TreatmentSummary[]>("/reports/treatments/summary", "Treatment Summary"),
        fetchWithErrorMsg<AppointmentStats | null>("/reports/appointments/stats", "Appointment Stats"),
      ])

      console.log("[Reports] Data fetched:", { countsData, archivedData, treatmentData, appointmentData })

      setClientCounts(countsData)
      setArchivedClients(Array.isArray(archivedData) ? archivedData : [])
      setTreatmentSummary(Array.isArray(treatmentData) ? treatmentData : [])
      setAppointmentStats(appointmentData)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load reports"
      setError(message)
      console.error("[Reports] Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [])

  const handleExportCSV = async (reportType: ReportType) => {
    setExporting(true)
    setError(null)
    try {
      const url = `${API_BASE}/reports/export/csv?report_type=${reportType}`
      console.log(`[Reports] Exporting CSV from ${url}`)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Export failed: Server returned ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.csv) throw new Error("Server returned empty CSV data")

      const csvContent: string = data.csv || ""
      const filename: string = data.filename || `report_${reportType}_${Date.now()}.csv`

      console.log(`[Reports] CSV generated: ${filename}`)

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      const url_obj = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url_obj)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      console.log("[Reports] Triggering download...")
      link.click()

      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url_obj)
      }, 100)
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Network error while exporting. Backend may not be running.")
        console.error("[Reports] Network error exporting CSV:", err)
      } else {
        const message = err instanceof Error ? err.message : "Failed to export CSV"
        setError(message)
        console.error("[Reports] Error exporting CSV:", err)
      }
    } finally {
      setExporting(false)
    }
  }

  if (!userProfile || !["branch_admin", "super_admin"].includes(userProfile.role || "")) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 md:p-8 transition-colors duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          <ReportsHeader loading={loading} onRefresh={fetchReportData} />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <ErrorBanner error={error} />
          </div>
        )}

        {/* Key Metrics Section */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both delay-100">
          <div className="px-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Appointments & Treatment Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">Client and appointment statistics</p>
          </div>
          <ClientStatusCards 
            clientCounts={clientCounts} 
            appointmentStats={appointmentStats}
            loading={loading} 
          />
        </section>

        {/* Export Section - Horizontal Action Bar */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both delay-200">
          <ExportSection exporting={exporting} loading={loading} onExport={handleExportCSV} />
        </div>

        {/* Data Tables - Main Content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both delay-300">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Treatment Summary */}
            <div className="transition-all duration-300 hover:shadow-xl rounded-xl ring-1 ring-border/50 hover:ring-border flex flex-col h-full">
              <TreatmentSummaryTable treatmentSummary={treatmentSummary} loading={loading} />
            </div>

            {/* Staff Appointments Table */}
            <div className="transition-all duration-300 hover:shadow-xl rounded-xl ring-1 ring-border/50 hover:ring-border flex flex-col h-full">
              <StaffAppointmentsTable />
            </div>
          </div>

          {/* Archived Clients */}
          <div className="transition-all duration-300 hover:shadow-xl rounded-xl ring-1 ring-border/50 hover:ring-border">
            <ArchivedClientsTable archivedClients={archivedClients} />
          </div>
        </div>

        {/* Empty State */}
        <div className="animate-in fade-in duration-700 delay-500 fill-mode-both">
          <EmptyState loading={loading} clientCounts={clientCounts} />
        </div>
      </div>
    </div>
  )
}