import { Outlet } from "react-router-dom"
import { AppNavbar } from "./app-navbar"

export function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
