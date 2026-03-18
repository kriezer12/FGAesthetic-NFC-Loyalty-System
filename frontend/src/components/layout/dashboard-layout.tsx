// @ts-nocheck

import { Suspense, useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { NotificationSettingsProvider } from "@/contexts/notification-settings-context"
import { MissedNotificationsProvider } from "@/contexts/missed-notifications-context"
import { AppNavbar } from "./app-navbar"
import { FirstLoginModal } from "../auth/first-login-modal"
import { AppointmentNotifier } from "../features/appointments/appointment-notifier"
import { AnnouncementNotifier } from "./announcement-notifier"
import { GlobalNFCListener } from "../features/nfc/global-nfc-listener"

function ContentLoader() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-bar {
          position: relative;
          overflow: hidden;
          border-radius: 0.5rem;
          background: hsl(var(--muted));
        }
        .skeleton-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.08) 40%,
            hsl(var(--primary) / 0.14) 50%,
            hsl(var(--primary) / 0.08) 60%,
            transparent 100%
          );
          animation: shimmer 1.8s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col items-center justify-center py-28 gap-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
        <div className="flex flex-col gap-3 w-full max-w-md">
          <div className="skeleton-bar h-4 w-3/4" />
          <div className="skeleton-bar h-4 w-full" />
          <div className="skeleton-bar h-4 w-1/2" />
        </div>
      </div>
    </>
  )
}

export function DashboardLayout() {
  const { userProfile, user, refreshUser } = useAuth()
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false)

  const location = useLocation()

  useEffect(() => {
    // Ensure no leftover overlay state blocks interaction when routes change.
    try {
      document.body.style.pointerEvents = ""
      document.body.style.overflow = ""
      document
        .querySelectorAll(
          "[data-radix-dialog-overlay],[data-radix-context-menu-overlay],[data-radix-dropdown-menu-overlay],[data-radix-popover-overlay]",
        )
        .forEach((el) => el.remove())
    } catch {
      // ignore if document not available
    }
  }, [location.pathname])

  useEffect(() => {
    // Defensive: if body is left unclickable for any reason, reset it immediately.
    if (typeof document === "undefined") return
    const cleanup = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = ""
      }
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = ""
      }
      document
        .querySelectorAll(
          "[data-radix-dialog-overlay],[data-radix-context-menu-overlay],[data-radix-dropdown-menu-overlay],[data-radix-popover-overlay]",
        )
        .forEach((el) => el.remove())
    }

    // Run once immediately
    cleanup()

    // Also observe body style changes and auto-fix if it becomes unclickable.
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === "none") {
        cleanup()
      }
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // Show first login modal if user.first_login is true
    if (userProfile && userProfile.first_login) {
      setShowFirstLoginModal(true)
    }
  }, [userProfile])

  const handleFirstLoginComplete = async () => {
    setShowFirstLoginModal(false)
    // Refresh the user profile to get the updated first_login status
    await refreshUser()
  }

  return (
    <NotificationSettingsProvider>
    <MissedNotificationsProvider>
    <div className="min-h-screen flex flex-col bg-background">
      <GlobalNFCListener />
      <AppointmentNotifier />
      <AnnouncementNotifier />
      <AppNavbar />
      <main className="flex-1 p-6">
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <FirstLoginModal
        isOpen={showFirstLoginModal}
        userEmail={user?.email}
        onComplete={handleFirstLoginComplete}
      />
    </div>
    </MissedNotificationsProvider>
    </NotificationSettingsProvider>
  )
}
