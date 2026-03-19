import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SelectNative } from "@/components/ui/select-native"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StaffSales } from "./types"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

export function StaffSalesTable() {
  const [salesData, setSalesData] = useState<StaffSales[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  const fetchSalesData = async (selectedPeriod: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/reports/staff/sales?period=${selectedPeriod}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      const data = await response.json()
      setSalesData(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("[StaffSalesTable] Error fetching data:", err)
      setError("Failed to load staff sales data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesData(period)
  }, [period])

  return (
    <Card className="flex flex-col h-full shadow-sm bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            Staff Sales Performance
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total sales per staff member
          </p>
        </div>
        <div className="w-full sm:w-[180px] relative">
          <SelectNative value={period} onChange={(e) => setPeriod(e.target.value)} className="pr-10">
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
            <option value="all">All Time</option>
          </SelectNative>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col min-h-0 px-0 sm:px-6">
        <div className="rounded-md border flex-grow overflow-auto relative">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[40%] font-semibold">Staff Name</TableHead>
                <TableHead className="text-center font-semibold">Appointments</TableHead>
                <TableHead className="text-right font-semibold">Total Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary" />
                      Loading sales data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              ) : salesData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    No sales data found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                salesData.map((staff) => (
                  <TableRow key={staff.staff_id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{staff.staff_name}</TableCell>
                    <TableCell className="text-center">{staff.completed_appointments}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(staff.total_sales)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
