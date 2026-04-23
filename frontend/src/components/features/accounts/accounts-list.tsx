import { useState, useMemo, useEffect } from "react"
import { Trash2, Edit2, MoreHorizontal, RotateCcw } from "lucide-react"
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
import { PasswordVerificationDialog } from "@/components/auth/password-verification-dialog"
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
  isDeletedTab?: boolean
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
        isActive ? "bg-green-100 text-green-800" : "bg-muted text-foreground"
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
            const signedUrl = await getAvatarSignedUrl("user-pictures", path, 604800)
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

const getTimeLeft = (deletedAt?: string | null) => {
  if (!deletedAt) return "-"
  const deletedDate = new Date(deletedAt)
  const expireDate = new Date(deletedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diffDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 0) return "Pending deletion"
  return `${diffDays} day${diffDays === 1 ? '' : 's'} left`
}

export function AccountsList({ accounts, onRefresh, isDeletedTab }: AccountsListProps) {
  const { updateAccount, deleteAccount, hardDeleteAccount, verifyPassword } = useAccounts()
  const { userProfile } = useAuth()
  const isSuper = userProfile?.role === 'super_admin'
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Account | null>(null)
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState<Account | null>(null)
  const [showPasswordVerification, setShowPasswordVerification] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

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

  const handleDeleteClick = () => {
    // First show password verification dialog
    setVerificationError(null)
    setShowPasswordVerification(true)
  }

  const handleRestoreClick = async (account: Account) => {
    try {
      await updateAccount(account.id, { is_active: true, deleted_at: null })
      await onRefresh()
    } catch (error) {
      console.error("Failed to restore account:", error)
    }
  }

  const handlePasswordVerified = async (password: string) => {
    if (!deleteConfirm && !hardDeleteConfirm) return
    
    setIsDeleting(true)
    setVerificationError(null)
    try {
      console.log("[Delete Flow] Verifying password...")
      // Verify the password
      const verified = await verifyPassword(password)
      if (!verified) {
        throw new Error("Incorrect password")
      }
      console.log("[Delete Flow] Password verified, deleting account...")
      
      // Password verified, proceed with deletion
      if (hardDeleteConfirm) {
        await hardDeleteAccount(hardDeleteConfirm.id)
      } else if (deleteConfirm) {
        await deleteAccount(deleteConfirm.id)
      }
      
      console.log("[Delete Flow] Account deleted, refreshing list...")
      await onRefresh()
      console.log("[Delete Flow] Refresh complete")
      
      // Close dialogs
      setShowPasswordVerification(false)
      setDeleteConfirm(null)
      setHardDeleteConfirm(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed"
      console.error("[Delete Flow] Error:", message)
      setVerificationError(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    console.log("[Delete Flow] Canceling deletion")
    setDeleteConfirm(null)
    setHardDeleteConfirm(null)
    setShowPasswordVerification(false)
    setVerificationError(null)
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
              <TableHead onClick={() => handleSort(isDeletedTab ? 'deleted_at' : 'created_at')} className="cursor-pointer">
                {isDeletedTab ? "Time Left" : "Created"} {sortKey === (isDeletedTab ? 'deleted_at' : 'created_at') ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
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
                  <TableCell className="text-sm">
                    {isDeletedTab ? (
                      <span className="text-red-500 font-medium">{getTimeLeft(account.deleted_at)}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {account.created_at
                          ? new Date(account.created_at).toLocaleDateString()
                          : "-"}
                      </span>
                    )}
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
                          {isDeletedTab ? (
                            <>
                              {(isSuper || account.role === 'staff') && (
                                <DropdownMenuItem
                                  onClick={() => handleRestoreClick(account)}
                                  className="text-green-600"
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Restore
                                </DropdownMenuItem>
                              )}
                              {(isSuper || account.role === 'staff') && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setHardDeleteConfirm(account)
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Permanently Delete
                                </DropdownMenuItem>
                              )}
                            </>
                          ) : (
                            <>
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
                                  onClick={() => {
                                    setDeleteConfirm(account)
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </>
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

      {/* Initial deletion confirmation dialog */}
      <Dialog 
        open={(deleteConfirm !== null || hardDeleteConfirm !== null) && !showPasswordVerification} 
        onOpenChange={(open) => !open && handleDeleteCancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hardDeleteConfirm ? "Permanently Delete Account" : "Delete Account"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {hardDeleteConfirm ? "permanently delete" : "delete"} {deleteConfirm?.email || hardDeleteConfirm?.email}? 
              {hardDeleteConfirm && " This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              {isDeleting ? "Verifying..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password verification dialog */}
      <PasswordVerificationDialog
        open={showPasswordVerification}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            console.log("[Password Dialog] Closed by user")
            handleDeleteCancel()
          }
        }}
        onVerify={handlePasswordVerified}
        title={`Verify Password to ${hardDeleteConfirm ? "Permanently " : ""}Delete Account`}
        description={`Enter your password to confirm deletion of ${deleteConfirm?.email || hardDeleteConfirm?.email}`}
        actionLabel={`Verify & ${hardDeleteConfirm ? "Permanently " : ""}Delete Account`}
        isVerifying={isDeleting}
        error={verificationError}
      />
    </>
  )
}
