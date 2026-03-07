import { useState } from "react"
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
]

export function EditAccountModal({
  account,
  open,
  onOpenChange,
  onSave,
}: EditAccountModalProps) {
  const [fullName, setFullName] = useState(account?.full_name || "")
  const [role, setRole] = useState(account?.role || "staff")
  const [isActive, setIsActive] = useState(account?.is_active ?? true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        full_name: fullName,
        role: role as "staff" | "branch_admin" | "super_admin",
        is_active: isActive,
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

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
            />
          </div>

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
