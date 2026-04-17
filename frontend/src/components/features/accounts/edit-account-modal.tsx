import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useBranches } from "@/hooks/use-branches"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { Account } from "@/hooks/use-accounts"

interface EditAccountModalProps {
  account: Account | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updates: Partial<Account>) => Promise<void>
}

const roleOptions = [
  { value: "staff", label: "Staff" },
  { value: "branch_admin", label: "Branch Admin" },
  { value: "super_admin", label: "Super Admin" },
].filter(r => !r.value.toLowerCase().includes('customer'))

export function EditAccountModal({
  account,
  open,
  onOpenChange,
  onSave,
}: EditAccountModalProps) {
  const { userProfile } = useAuth()
  const isSuper = userProfile?.role === "super_admin"
  const { branches } = useBranches()

  const [fullName, setFullName] = useState(account?.full_name || "")
  const [role, setRole] = useState(account?.role || "staff")
  const [branch, setBranch] = useState(account?.branch_id || "")
  const [isActive, setIsActive] = useState(account?.is_active ?? true)
  const [isSaving, setIsSaving] = useState(false)

  const isSuperAdminAccount = account?.role === "super_admin"
  const canChangeRole = !isSuperAdminAccount

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates: Partial<Account> = {
        full_name: fullName,
        role: role as "staff" | "branch_admin" | "super_admin",
        is_active: isActive,
      }
      if (isSuper) {
        updates.branch_id = branch || null
      }
      await onSave(updates)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  // reset form whenever account changes
  useEffect(() => {
    setFullName(account?.full_name || "")
    setRole(account?.role || "staff")
    setIsActive(account?.is_active ?? true)
    setBranch(account?.branch_id || "")
  }, [account])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update account information for {account?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email (Read-only)</Label>
            <Input id="email" value={account?.email || ""} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Combobox
              options={roleOptions}
              value={role}
              onValueChange={(val) => setRole(val as "staff" | "branch_admin" | "super_admin")}
              placeholder="Select a role"
              disabled={!canChangeRole}
            />
            {isSuperAdminAccount && (
              <p className="text-sm text-primary">
                Super admin privileges cannot be downgraded or removed.
              </p>
            )}
          </div>

          {isSuper && (
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Combobox
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                value={branch}
                onValueChange={(val) => setBranch(val)}
                placeholder="Select branch"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border border-primary"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
