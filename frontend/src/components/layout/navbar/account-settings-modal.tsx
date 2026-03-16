import { useState, useEffect, useRef } from "react"
import { Camera, Loader2, AlertCircle, CheckCircle } from "lucide-react"
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
import { uploadToSupabase, getAvatarSignedUrl } from "@/lib/supabase-storage"
import { validateFile } from "@/lib/file-validation"
import { convertToWebP, generateFileName } from "@/lib/image-utils"

interface AccountSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NAME_CHANGE_LIMIT = 5
const AVATAR_BUCKET = "user-pictures"
const currentMonth = () => new Date().toISOString().slice(0, 7) // "YYYY-MM"

export function AccountSettingsModal({ open, onOpenChange }: AccountSettingsModalProps) {
  const { user, refreshUser, userProfile } = useAuth()

  const [fullName, setFullName] = useState("")
  
  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProcessing, setAvatarProcessing] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

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
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFullName(
        userProfile?.full_name ?? user?.user_metadata?.full_name ??
          user?.email?.split("@")[0] ??
          ""
      )
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview)
      }
      
      // Get avatar from profile, or fallback to auth metadata
      const avatarUrl = userProfile?.avatar_url || (user?.user_metadata?.avatar_url as string) || null
      setAvatarPreview(null)
      
      // Generate signed URL immediately for faster display
      if (avatarUrl && avatarUrl.includes("user-pictures")) {
        const generateSignedUrl = async () => {
          try {
            const pathMatch = avatarUrl.match(/user-pictures\/(.*?)(\?|$)/)
            if (pathMatch) {
              const path = pathMatch[1]
              const signedUrl = await getAvatarSignedUrl("user-pictures", path, 28800)
              if (signedUrl) {
                setDisplayAvatarUrl(signedUrl)
              } else {
                setDisplayAvatarUrl(avatarUrl)
              }
            }
          } catch (error) {
            console.error("Error fetching signed URL:", error)
            setDisplayAvatarUrl(avatarUrl)
          }
        }
        generateSignedUrl()
      } else {
        // Not a storage URL, use as-is
        setDisplayAvatarUrl(avatarUrl)
      }
      
      setAvatarFile(null)
      setAvatarMsg(null)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setProfileMsg(null)
      setPasswordMsg(null)
    }
    
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [open, user, userProfile])

  const userInitial = (
    userProfile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "?"
  )
    .charAt(0)
    .toUpperCase()

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarMsg(null)
    const errors = validateFile(file)

    if (errors.length > 0) {
      setAvatarMsg({ type: "error", text: errors.map((e) => e.message).join(", ") })
      return
    }

    setAvatarFile(file)
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user?.id) return

    setAvatarProcessing(true)
    setAvatarMsg(null)

    try {
      const processed = await convertToWebP(avatarFile, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.9,
      })

      setAvatarProcessing(false)
      setAvatarUploading(true)

      const fileName = generateFileName(avatarFile.name, "webp")
      const path = `avatars/${user.id}/${fileName}`

      const result = await uploadToSupabase(AVATAR_BUCKET, path, processed.blob)

      if (!result.success || !result.url) {
        throw new Error(result.error || "Upload failed")
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: result.url,
        },
      })

      if (updateError) throw updateError

      // Also try to update user_profiles if RLS allows it
      await supabase
        .from("user_profiles")
        .update({ avatar_url: result.url })
        .eq("id", user.id)
      
      // Silently ignore RLS errors - avatar is stored in auth metadata

      await refreshUser()
      setAvatarFile(null)
      setAvatarMsg({ type: "success", text: "Avatar updated successfully!" })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed"
      setAvatarMsg({ type: "error", text: errorMsg })
    } finally {
      setAvatarProcessing(false)
      setAvatarUploading(false)
    }
  }

  const handleAvatarCancel = () => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleUpdateProfile() {
    if (nameChangeLimitReached) return
    setSaving(true)
    setProfileMsg(null)

    const newCount = nameChangeCount + 1

    const [authResult, profileResult] = await Promise.all([
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

    const authError = authResult.error
    const profileError = profileResult.error
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
      <DialogContent overlayBlur="subtle" className="max-w-md w-full">
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
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover border border-border"
                  />
                ) : displayAvatarUrl ? (
                  <img
                    src={displayAvatarUrl}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold select-none">
                    {userInitial}
                  </div>
                )}
                {/* Change overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading || avatarProcessing}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {avatarProcessing || avatarUploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                  disabled={avatarUploading || avatarProcessing}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium leading-none">{fullName || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Avatar Upload Actions */}
            {avatarFile && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAvatarUpload}
                  disabled={avatarUploading || avatarProcessing}
                  className="gap-2 flex-1"
                >
                  {avatarProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : avatarUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Photo"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAvatarCancel}
                  disabled={avatarUploading || avatarProcessing}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Avatar Messages */}
            {avatarMsg && (
              <div
                className={`flex gap-2 p-3 rounded-md text-xs ${
                  avatarMsg.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {avatarMsg.type === "success" ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                )}
                <p>{avatarMsg.text}</p>
              </div>
            )}

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
                onClick={handleUpdateProfile}
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
