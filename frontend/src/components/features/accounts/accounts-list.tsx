import { useState, useMemo, useEffect } from "react"
import { Trash2, Edit2, MoreHorizontal } from "lucide-react"
import { Account, useAccounts } from "@/hooks/use-accounts"
import { useAuth } from "@/contexts/auth-context"
import { getAvatarSignedUrl } from "@/lib/supabase-storage"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditAccountModal } from "./edit-account-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AccountsListProps {
  accounts: Account[]
  onRefresh: () => Promise<void>
}

const RoleBadge = ({ role }: { role: string }) => {
  const getStyles = (r: string) => {
    switch (r) {
      case "super_admin":
        return "bg-red-100 text-red-800"
      case "branch_admin":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStyles(role)}`}>
      {role.replace("_", " ")}
    </span>
  )
}

const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  )
}

const AccountAvatarCell = ({ account }: { account: Account }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const initial = (account.full_name || account.email).charAt(0).toUpperCase()

  useEffect(() => {
    const generateAvatarUrl = async () => {
      if (account.avatar_url && account.avatar_url.includes("user-pictures")) {
        try {
          const pathMatch = account.avatar_url.match(/user-pictures\/(.*?)(\?|$)/)
          if (pathMatch) {
            const path = pathMatch[1]
            const signedUrl = await getAvatarSignedUrl("user-pictures", path, 28800)
            setAvatarUrl(signedUrl || account.avatar_url)
          }
        } catch (error) {
          console.error("Error fetching signed URL:", error)
          setAvatarUrl(account.avatar_url)
        }
      } else {
        setAvatarUrl(account.avatar_url || null)
      }
    }

    generateAvatarUrl()
  }, [account.avatar_url])

  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={account.full_name || account.email}
          className="h-8 w-8 rounded-full object-cover border border-border"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initial}
        </div>
      )}
      <span>{account.full_name || "-"}</span>
    </div>
  )
}

export function AccountsList({ accounts, onRefresh }: AccountsListProps) {
  const { updateAccount, deleteAccount } = useAccounts()
  const { userProfile } = useAuth()
  const isSuper = userProfile?.role === 'super_admin'
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Account | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // sorting state
  const [sortKey, setSortKey] = useState<keyof Account | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: keyof Account) => {
    console.log('sort clicked', key)
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedAccounts = useMemo(() => {
    if (!sortKey) return accounts
    const sorted = [...accounts].sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      if (va < vb) return sortDirection === 'asc' ? -1 : 1
      if (va > vb) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [accounts, sortKey, sortDirection])

  const handleEdit = async (updates: Partial<Account>) => {
    if (!editingAccount) return
    try {
      await updateAccount(editingAccount.id, updates)
      await onRefresh()
    } catch (error) {
      console.error("Failed to update account:", error)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteAccount(deleteConfirm.id)
      await onRefresh()
      setDeleteConfirm(null)
    } catch (error) {
      console.error("Failed to delete account:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Profile</TableHead>
              <TableHead onClick={() => handleSort('email')} className="cursor-pointer">
                Email {sortKey === 'email' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              {isSuper && (
                <TableHead onClick={() => handleSort('branch_name')} className="cursor-pointer">
                  Branch {sortKey === 'branch_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </TableHead>
              )}
              <TableHead onClick={() => handleSort('role')} className="cursor-pointer">
                Role {sortKey === 'role' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead onClick={() => handleSort('is_active')} className="cursor-pointer">
                Status {sortKey === 'is_active' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead onClick={() => handleSort('created_at')} className="cursor-pointer">
                Created {sortKey === 'created_at' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="w-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuper ? 5 : 4} className="text-center py-8">
                  <p className="text-muted-foreground">No accounts found</p>
                </TableCell>
              </TableRow>
            ) : (
              sortedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <AccountAvatarCell account={account} />
                  </TableCell>
                  <TableCell className="font-medium">{account.email}</TableCell>
                  {isSuper && (
                    <TableCell>{account.branch_name || "-"}</TableCell>
                  )}
                  <TableCell>
                    <RoleBadge role={account.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge isActive={account.is_active} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {account.created_at
                      ? new Date(account.created_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {/* show trigger only if super_admin or role is staff */}
                    {(isSuper || account.role === 'staff') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* branch admins may only modify staff accounts */}
                          {(isSuper || account.role === 'staff') && (
                            <DropdownMenuItem
                              onClick={() => setEditingAccount(account)}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {(isSuper || account.role === 'staff') && (
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(account)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditAccountModal
        account={editingAccount}
        open={editingAccount !== null}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        onSave={handleEdit}
      />

      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirm?.email}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
