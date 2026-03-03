/**
 * Appointments Page
 * =================
 *
 * Calendar-based view for booking and managing customer appointments.
 */

import { useEffect } from "react"
import { CalendarView } from "@/components/features/calendar"

export default function AppointmentsPage() {
  useEffect(() => {
    document.title = "Appointments - FG Aesthetic Centre"
  }, [])

  return <CalendarView />
}
