// @ts-nocheck

import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { AppNavbar } from "./app-navbar"
import { FirstLoginModal } from "../auth/first-login-modal"

export function DashboardLayout() {
  const { userProfile, user, refreshUser } = useAuth()
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false)

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
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <FirstLoginModal
        isOpen={showFirstLoginModal}
        userEmail={user?.email}
        onComplete={handleFirstLoginComplete}
      />
    </div>
  )
}
