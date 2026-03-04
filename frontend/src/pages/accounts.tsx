/**
 * Accounts Page
 * =============
 *
 * Allows superadmin and branch_admin to manage staff accounts.
 * Only accessible to users with appropriate roles.
 */

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Navigate } from "react-router-dom"
import { CreateAccountForm } from "@/components/features/accounts"

export default function AccountsPage() {
  useEffect(() => {
    document.title = "Accounts - FG Aesthetic Centre"
  }, [])

  const { userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Check if user has permission to access accounts
  if (!userProfile || !["super_admin", "branch_admin"].includes(userProfile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Accounts Management</h1>
        <p className="text-muted-foreground mt-2">Create and manage staff accounts</p>
      </div>

      <div className="grid gap-6">
        <CreateAccountForm />
      </div>
    </div>
  )
}
