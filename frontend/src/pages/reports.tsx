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
  EmptyState,
} from "@/components/features/reports"
import type { ClientCounts, ArchivedClient, TreatmentSummary } from "@/components/features/reports"

type ReportType = "full" | "clients" | "treatments"

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
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReportData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log(`[Reports] Fetching from ${API_BASE}`)

      const [countsData, archivedData, treatmentData] = await Promise.all([
        fetchWithErrorMsg<ClientCounts>("/reports/clients/counts", "Client Counts"),
        fetchWithErrorMsg<ArchivedClient[]>("/reports/clients/archived", "Archived Clients"),
        fetchWithErrorMsg<TreatmentSummary[]>("/reports/treatments/summary", "Treatment Summary"),
      ])

      console.log("[Reports] Data fetched:", { countsData, archivedData, treatmentData })

      setClientCounts(countsData)
      setArchivedClients(Array.isArray(archivedData) ? archivedData : [])
      setTreatmentSummary(Array.isArray(treatmentData) ? treatmentData : [])
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <ReportsHeader loading={loading} onRefresh={fetchReportData} />

        {error && <ErrorBanner error={error} />}

        <ClientStatusCards clientCounts={clientCounts} loading={loading} />

        <ExportSection exporting={exporting} loading={loading} onExport={handleExportCSV} />

        <ArchivedClientsTable archivedClients={archivedClients} />

        <TreatmentSummaryTable treatmentSummary={treatmentSummary} loading={loading} />

        <EmptyState loading={loading} clientCounts={clientCounts} />      </div>
    </div>
  )
}