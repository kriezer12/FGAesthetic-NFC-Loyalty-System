/**
 * User Management Page
 * ====================
 * 
 * Allows super admins to:
 * - View all users
 * - Change user roles
 * - Assign users to branches
 * - Activate/deactivate accounts
 */

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  UserCog, 
  Search, 
  Shield, 
  Building2, 
  UserCheck, 
  UserX,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import type { UserProfile, UserRole, Branch } from "@/types/auth"
import { ROLE_DISPLAY_NAMES } from "@/types/auth"

export default function UserManagement() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  const canManageRoles = hasPermission("users:manage_roles")
  const canUpdateUsers = hasPermission("users:update")

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError
      setUsers(data || [])
    } catch (err) {
      console.error("Error fetching users:", err)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBranches = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (fetchError) throw fetchError
      setBranches(data || [])
    } catch (err) {
      console.error("Error fetching branches:", err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchBranches()
  }, [fetchUsers, fetchBranches])

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!canManageRoles) return

    try {
      setUpdating(userId)
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ role: newRole })
        .eq("id", userId)

      if (updateError) throw updateError

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
    } catch (err) {
      console.error("Error updating role:", err)
      setError("Failed to update user role")
    } finally {
      setUpdating(null)
    }
  }

  const updateUserBranch = async (userId: string, branchId: string | null) => {
    if (!canUpdateUsers) return

    try {
      setUpdating(userId)
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ branch_id: branchId })
        .eq("id", userId)

      if (updateError) throw updateError

      setUsers(users.map(u => 
        u.id === userId ? { ...u, branch_id: branchId } : u
      ))
    } catch (err) {
      console.error("Error updating branch:", err)
      setError("Failed to update user branch")
    } finally {
      setUpdating(null)
    }
  }

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    if (!canUpdateUsers) return

    try {
      setUpdating(userId)
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ is_active: isActive })
        .eq("id", userId)

      if (updateError) throw updateError

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: isActive } : u
      ))
    } catch (err) {
      console.error("Error toggling user status:", err)
      setError("Failed to update user status")
    } finally {
      setUpdating(null)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    )
  })

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "—"
    const branch = branches.find(b => b.id === branchId)
    return branch?.name || "Unknown"
  }

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "branch_admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "staff":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>User Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <UserCog className="h-6 w-6" />
                User Management
              </h1>
              <p className="text-muted-foreground">
                Manage user accounts, roles, and branch assignments
              </p>
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            All registered users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">User</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Branch</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {canManageRoles ? (
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                            disabled={updating === user.id}
                            className="text-sm rounded-md border border-input bg-background px-2 py-1"
                            title="Select user role"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="branch_admin">Branch Admin</option>
                            <option value="staff">Staff</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                            <Shield className="h-3 w-3" />
                            {ROLE_DISPLAY_NAMES[user.role]}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {canUpdateUsers ? (
                          <select
                            value={user.branch_id || ""}
                            onChange={(e) => updateUserBranch(user.id, e.target.value || null)}
                            disabled={updating === user.id}
                            className="text-sm rounded-md border border-input bg-background px-2 py-1"
                            title="Select branch"
                          >
                            <option value="">No Branch</option>
                            {branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {getBranchName(user.branch_id)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}>
                          {user.is_active ? (
                            <>
                              <UserCheck className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {canUpdateUsers && (
                          <Button
                            variant={user.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleUserActive(user.id, !user.is_active)}
                            disabled={updating === user.id}
                          >
                            {updating === user.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : user.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => !u.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
