import { useState, useEffect } from "react"
import { Camera, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface AccountSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NAME_CHANGE_LIMIT = 5
const currentMonth = () => new Date().toISOString().slice(0, 7) // "YYYY-MM"

export function AccountSettingsModal({ open, onOpenChange }: AccountSettingsModalProps) {
  const { user, refreshUser, userProfile } = useAuth()

  const [fullName, setFullName] = useState("")

  // Format role for display (e.g., "super_admin" -> "Super Admin")
  const formatRole = (role?: string): string => {
    if (!role) return "—"
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const storedMonth: string = user?.user_metadata?.name_change_month ?? ""
  const nameChangeCount: number =
    storedMonth === currentMonth() ? (user?.user_metadata?.name_change_count ?? 0) : 0
  const nameChangesLeft = Math.max(0, NAME_CHANGE_LIMIT - nameChangeCount)
  const nameChangeLimitReached = nameChangesLeft === 0

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [saving, setSaving]           = useState(false)
  const [profileMsg, setProfileMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (open) {
      setFullName(
        userProfile?.full_name ?? user?.user_metadata?.full_name ??
          user?.email?.split("@")[0] ??
          ""
      )
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setProfileMsg(null)
      setPasswordMsg(null)
    }
  }, [open, user, userProfile])

  const userInitial = (
    userProfile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "?"
  )
    .charAt(0)
    .toUpperCase()

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (nameChangeLimitReached) return
    setSaving(true)
    setProfileMsg(null)

    const newCount = nameChangeCount + 1

    const [{ error: authError }, { error: profileError }] = await Promise.all([
      supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          name_change_count: newCount,
          name_change_month: currentMonth(),
        },
      }),
      supabase
        .from("user_profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user!.id),
    ])

    const error = authError ?? profileError
    if (error) {
      setSaving(false)
      setProfileMsg({ type: "error", text: error.message })
    } else {
      await refreshUser()
      setSaving(false)
      const remaining = NAME_CHANGE_LIMIT - newCount
      setProfileMsg({
        type: "success",
        text: remaining > 0
          ? `Profile updated. You have ${remaining} name change${remaining === 1 ? "" : "s"} left this month.`
          : "Profile updated. You have used all name changes for this month.",
      })
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters." })
      return
    }
    const email = user?.email
    if (!email) {
      setPasswordMsg({ type: "error", text: "No email on account." })
      return
    }
    setSaving(true)
    setPasswordMsg(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (signInError) {
      setSaving(false)
      setPasswordMsg({ type: "error", text: "Current password is incorrect." })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) {
      setPasswordMsg({ type: "error", text: error.message })
    } else {
      setPasswordMsg({ type: "success", text: "Password changed successfully." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  const passwordMismatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full" variant="top-right-centered">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Manage your profile and password.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="flex flex-col gap-8 pr-4">

          {/* ── Profile ─────────────────────────────────────────── */}
          <section className="flex flex-col gap-5">
            <h3 className="text-sm font-semibold">Profile</h3>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group w-16 h-16 shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold select-none">
                  {userInitial}
                </div>
                {/* Change overlay – WIP webp */}
                <button
                  type="button"
                  disabled
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed"
                  title="Photo upload coming soon"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium leading-none">{fullName || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="acc-name">Full Name</Label>
                  <span className={`text-xs ${
                    nameChangeLimitReached
                      ? "text-destructive"
                      : nameChangesLeft === 1
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  }`}>
                    {nameChangeLimitReached
                      ? "No changes remaining"
                      : `${nameChangesLeft} change${nameChangesLeft === 1 ? "" : "s"} remaining`}
                  </span>
                </div>
                <Input
                  id="acc-name"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  readOnly={nameChangeLimitReached}
                  className={nameChangeLimitReached ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-email">Email Address</Label>
                <Input
                  id="acc-email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed select-none"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-role">Role</Label>
                <Input
                  id="acc-role"
                  value={formatRole(userProfile?.role)}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed select-none"
                />
              </div>
            </div>

            {profileMsg && (
              <p className={`text-xs ${profileMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {profileMsg.text}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={saving || !fullName.trim() || nameChangeLimitReached}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </section>

          <div className="border-t" />

          {/* ── Change Password ──────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Change Password</h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cur-pw">Current Password</Label>
                <Input
                  id="cur-pw"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-pw">Confirm New Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={passwordMismatch ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {passwordMismatch && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>
            </div>

            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {passwordMsg.text}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleChangePassword}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword || passwordMismatch}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Update Password
              </Button>
            </div>
          </section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
