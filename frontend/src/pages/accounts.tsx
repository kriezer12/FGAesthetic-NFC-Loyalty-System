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
import { CreateAccountForm, AccountsList } from "@/components/features/accounts"
import { useAccounts } from "@/hooks/use-accounts"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus } from "lucide-react"
import { AddAccountModal } from "@/components/features/accounts"

export default function AccountsPage() {
  useEffect(() => {
    document.title = "Accounts - FG Aesthetic Centre"
  }, [])

  const { userProfile, loading } = useAuth()
  const { accounts, loading: accountsLoading, error, fetchAccounts } = useAccounts()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Accounts Management</h1>
          <p className="text-muted-foreground mt-2">Create and manage staff accounts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
            disabled={accountsLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setAddAccountOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Accounts</p>
          <p className="text-2xl font-bold">{accounts.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Accounts</p>
          <p className="text-2xl font-bold">{accounts.filter(a => a.is_active).length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold">{accounts.filter(a => a.role !== 'staff').length}</p>
        </div>
      </div>

      {/* Accounts table */}
      <AccountsList accounts={accounts} onRefresh={fetchAccounts} />

      {/* Add Account Modal */}
      <AddAccountModal open={addAccountOpen} onOpenChange={setAddAccountOpen} />
    </div>
  )
}
