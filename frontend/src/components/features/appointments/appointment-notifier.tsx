import { useEffect, useState, useCallback, useRef } from "react"
import { useAppointments } from "@/hooks/use-appointments"
import { useNotificationSettings } from "@/contexts/notification-settings-context"
import { useMissedNotifications } from "@/contexts/missed-notifications-context"
import { NotificationToast } from "@/components/ui/notification-toast"
import { differenceInMinutes, parseISO, isAfter } from "date-fns"

interface AppointmentNotification {
  id: string
  appointmentId: string
  title: string
  message: string
  timestamp: number
  type: "first" | "second"
}

export function AppointmentNotifier() {
  const { appointments } = useAppointments()
  const { settings } = useNotificationSettings()
  const { addMissedNotification } = useMissedNotifications()
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([])
  const notifiedRef = useRef<Record<string, Set<string>>>({
    first: new Set<string>(),
    second: new Set<string>(),
  })

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const handleAutoDismiss = useCallback((id: string) => {
    // Find the notification data before removing it
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id)
      if (notification) {
        addMissedNotification({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          timestamp: notification.timestamp,
          type: notification.type === "second" ? "warning" : "info",
        })
      }
      return prev.filter((n) => n.id !== id)
    })
  }, [addMissedNotification])

  useEffect(() => {
    // Expose a test function to window for console testing
    (window as any).triggerTestNotification = (type: "first" | "second" = "first") => {
      const alertConfig = type === "first" ? settings.firstAlert : settings.secondAlert
      const id = `test-${Date.now()}`
      setNotifications((prev) => [
        ...prev,
        {
          id,
          appointmentId: "test-id",
          title: "Test Notification",
          message: `This is a test ${alertConfig.minutes}-minute notification triggered from console.`,
          timestamp: Date.now(),
          type,
        },
      ])
      return `Test ${type} notification triggered!`
    }

    const { firstAlert, secondAlert } = settings

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

        // First alert notification window (configured minutes ± 2 min buffer)
        if (
          firstAlert.enabled &&
          minsUntil <= firstAlert.minutes &&
          minsUntil > firstAlert.minutes - 5 &&
          !notifiedRef.current["first"].has(appt.id)
        ) {
          newNotifications.push({
            id: `${appt.id}-first`,
            appointmentId: appt.id,
            title: "Upcoming Appointment",
            message: `Appointment "${appt.title}" for ${appt.customer_name || "Unknown Customer"} starts in ${firstAlert.minutes} minutes.`,
            timestamp: Date.now(),
            type: "first",
          })
          notifiedRef.current["first"].add(appt.id)
        }

        // Second alert notification window
        if (
          secondAlert.enabled &&
          minsUntil <= secondAlert.minutes &&
          minsUntil > 0 &&
          !notifiedRef.current["second"].has(appt.id)
        ) {
          newNotifications.push({
            id: `${appt.id}-second`,
            appointmentId: appt.id,
            title: "Appointment Starting Soon",
            message: `Appointment "${appt.title}" for ${appt.customer_name || "Unknown Customer"} starts in ${secondAlert.minutes} minutes.`,
            timestamp: Date.now(),
            type: "second",
          })
          notifiedRef.current["second"].add(appt.id)
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
  }, [appointments, settings])

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
          onAutoDismiss={handleAutoDismiss}
          type={notification.type === "second" ? "warning" : "info"}
        />
      ))}
    </div>
  )
}

