/**
 * Accounts Page
 * =============
 *
 * Allows superadmin and branch_admin to manage staff accounts.
 * Only accessible to users with appropriate roles.
 */

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Navigate } from "react-router-dom"
import { CreateAccountForm, AccountsList } from "@/components/features/accounts"
import { useAccounts } from "@/hooks/use-accounts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Plus, Search, X } from "lucide-react"
import { AddAccountModal } from "@/components/features/accounts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AccountsPage() {
  useEffect(() => {
    document.title = "Accounts - FG Aesthetic Centre"
  }, [])

  const { userProfile, loading } = useAuth()
  const { accounts, loading: accountsLoading, error, fetchAccounts } = useAccounts()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)

  // search state
  const [searchTerm, setSearchTerm] = useState("")

  const filteredAccounts = useMemo(() => {
    let filtered = accounts.filter((a) => !a.role.toLowerCase().includes('customer'))
    if (!searchTerm) return filtered
    const term = searchTerm.toLowerCase()
    return filtered.filter((a) =>
      a.email.toLowerCase().includes(term) ||
      (a.full_name && a.full_name.toLowerCase().includes(term)) ||
      (a.branch_name && a.branch_name.toLowerCase().includes(term))
    )
  }, [accounts, searchTerm])

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

      {/* Search field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          name="account_search_query"
          autoComplete="off"
          placeholder="Search by email, name, or branch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active Accounts</TabsTrigger>
          <TabsTrigger value="deleted">Recently Deleted</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-0">
          <AccountsList 
            accounts={filteredAccounts.filter(a => a.is_active)} 
            onRefresh={fetchAccounts} 
          />
        </TabsContent>
        <TabsContent value="deleted" className="mt-0">
          <AccountsList 
            accounts={filteredAccounts.filter(a => !a.is_active)} 
            onRefresh={fetchAccounts} 
            isDeletedTab={true}
          />
        </TabsContent>
      </Tabs>

      {/* Add Account Modal */}
      <AddAccountModal
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        onSuccess={fetchAccounts}
      />
    </div>
  )
}
