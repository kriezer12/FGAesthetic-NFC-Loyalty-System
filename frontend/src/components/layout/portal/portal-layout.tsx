import { Outlet } from "react-router-dom"
import { PortalNavbar } from "./portal-navbar"
import { NotificationSettingsProvider } from "@/contexts/notification-settings-context"
import { MissedNotificationsProvider } from "@/contexts/missed-notifications-context"

export function PortalLayout() {
  return (
    <NotificationSettingsProvider>
      <MissedNotificationsProvider>
        <div className="flex flex-col min-h-screen bg-slate-50/50">
          <PortalNavbar />
          <main className="flex-1 w-full overflow-auto pt-6 pb-20 px-4 md:px-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </MissedNotificationsProvider>
    </NotificationSettingsProvider>
  )
}
