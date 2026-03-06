/**
 * Add Account Modal Component
 * ===========================
 *
 * Modal dialog for creating new user accounts.
 */

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateAccountForm } from "@/components/features/accounts"

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAccountModal({ open, onOpenChange }: AddAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayBlur="subtle" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogDescription>
            Create a new staff account in the system
          </DialogDescription>
        </DialogHeader>
        <CreateAccountForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
