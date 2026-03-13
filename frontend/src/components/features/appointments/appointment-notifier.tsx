import { useEffect, useState, useCallback, useRef } from "react"
import { useAppointments } from "@/hooks/use-appointments"
import { NotificationToast } from "@/components/ui/notification-toast"
import { differenceInMinutes, parseISO, isAfter } from "date-fns"

interface AppointmentNotification {
  id: string
  appointmentId: string
  title: string
  message: string
  timestamp: number
  type: "30min" | "15min"
}

export function AppointmentNotifier() {
  const { appointments } = useAppointments()
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([])
  const notifiedRef = useRef<Record<string, Set<string>>>({
    "30min": new Set<string>(),
    "15min": new Set<string>(),
  })

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  useEffect(() => {
    // Expose a test function to window for console testing
    (window as any).triggerTestNotification = (type: "30min" | "15min" = "30min") => {
      const id = `test-${Date.now()}`
      setNotifications((prev) => [
        ...prev,
        {
          id,
          appointmentId: "test-id",
          title: "Test Notification",
          message: `This is a test ${type} notification triggered from console.`,
          timestamp: Date.now(),
          type
        }
      ])
      return `Test ${type} notification triggered!`
    }

    const checkAppointments = () => {
      const now = new Date()
      const newNotifications: AppointmentNotification[] = []

      appointments.forEach((appt) => {
        // Only notify for scheduled or confirmed appointments
        if (appt.status !== "scheduled" && appt.status !== "confirmed") return

        const startTime = parseISO(appt.start_time)
        
        // Skip appointments already in the past
        if (!isAfter(startTime, now)) return

        const minsUntil = differenceInMinutes(startTime, now)

        // 30-minute notification window (28-32 mins)
        if (minsUntil <= 30 && minsUntil > 25 && !notifiedRef.current["30min"].has(appt.id)) {
          newNotifications.push({
            id: `${appt.id}-30min`,
            appointmentId: appt.id,
            title: "Upcoming Appointment",
            message: `Appointment "${appt.title}" for ${appt.customer_name || "Unknown Customer"} starts in 30 minutes.`,
            timestamp: Date.now(),
            type: "30min"
          })
          notifiedRef.current["30min"].add(appt.id)
        }

        // 15-minute notification window (13-17 mins)
        if (minsUntil <= 15 && minsUntil > 0 && !notifiedRef.current["15min"].has(appt.id)) {
          newNotifications.push({
            id: `${appt.id}-15min`,
            appointmentId: appt.id,
            title: "Appointment Starting Soon",
            message: `Appointment "${appt.title}" for ${appt.customer_name || "Unknown Customer"} starts in 15 minutes.`,
            timestamp: Date.now(),
            type: "15min"
          })
          notifiedRef.current["15min"].add(appt.id)
        }
      })

      if (newNotifications.length > 0) {
        setNotifications((prev) => [...prev, ...newNotifications])
      }
    }

    // Check every minute
    const interval = setInterval(checkAppointments, 60000)
    
    // Initial check
    checkAppointments()

    return () => clearInterval(interval)
  }, [appointments])

  if (notifications.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-end gap-2 px-4 pt-20 pb-6 sm:px-6 sm:pt-20 sm:pb-6"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          id={notification.id}
          title={notification.title}
          message={notification.message}
          onClose={removeNotification}
          type={notification.type === "15min" ? "warning" : "info"}
        />
      ))}
    </div>
  )
}
