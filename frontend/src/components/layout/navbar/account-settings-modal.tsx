import { useState, useEffect, useRef } from "react"
import { Camera, Loader2, AlertCircle, CheckCircle, User, Shield, Key, Mail, BadgeCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils"

interface AccountSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NAME_CHANGE_LIMIT = 5
const AVATAR_BUCKET = "user-pictures"
const currentMonth = () => new Date().toISOString().slice(0, 7) // "YYYY-MM"

type Tab = "general" | "security"

export function AccountSettingsModal({ open, onOpenChange }: AccountSettingsModalProps) {
  const { user, refreshUser, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("general")

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
      setAvatarPreview(null) // Only used for local file selection
      
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
      setActiveTab("general")
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

      await supabase
        .from("user_profiles")
        .update({ avatar_url: result.url })
        .eq("id", user.id)
      
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

  const tabs = [
    { id: "general", label: "General", icon: User },
    { id: "security", label: "Security", icon: Shield },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayBlur="subtle" className="max-w-3xl w-full p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex h-[600px]">
          {/* Sidebar */}
          <aside className="w-64 bg-muted/30 border-r border-border p-6 flex flex-col gap-6">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Settings</DialogTitle>
              <DialogDescription className="text-xs mt-1">Manage your account preferences</DialogDescription>
            </div>

            <nav className="flex flex-col gap-1 flex-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === tab.id 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold leading-none">Status</p>
                  <p className="text-xs font-semibold text-foreground">Active Account</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-background/50 backdrop-blur-xl">
            <ScrollArea className="flex-1">
              <div className="p-8">
                {activeTab === "general" ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section>
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                         Personal Information
                      </h3>

                      <div className="flex flex-col gap-8">
                        {/* Avatar Section */}
                        <div className="flex items-center gap-6 p-4 rounded-xl border border-border/50 bg-muted/20">
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-inner bg-muted flex items-center justify-center">
                              {avatarPreview || displayAvatarUrl ? (
                                <img
                                  src={avatarPreview || displayAvatarUrl || ""}
                                  alt="Avatar"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <span className="text-3xl font-bold text-primary/40">{userInitial}</span>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={avatarUploading || avatarProcessing}
                              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group-hover:rotate-6"
                            >
                              {avatarProcessing || avatarUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Camera className="w-4 h-4" />
                              )}
                            </button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarFileSelect}
                              className="hidden"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <h4 className="font-bold text-foreground truncate max-w-[200px]">{fullName || "Unnamed User"}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                              <Mail className="w-3 h-3" /> {user?.email}
                            </p>
                            <div className="mt-2 flex gap-2">
                              {avatarFile ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default" 
                                    className="h-8 rounded-lg shadow-sm"
                                    onClick={handleAvatarUpload}
                                    disabled={avatarUploading || avatarProcessing}
                                  >
                                    Save Photo
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 rounded-lg"
                                    onClick={handleAvatarCancel}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  className="h-8 rounded-lg font-medium"
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  Change Photo
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {avatarMsg && (
                          <div className={cn(
                            "flex items-center gap-3 p-3 rounded-lg text-sm font-medium border animate-in fade-in zoom-in duration-300",
                            avatarMsg.type === "success" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}>
                            {avatarMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {avatarMsg.text}
                          </div>
                        )}

                        {/* Fields */}
                        <div className="grid gap-6">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                              <Label htmlFor="acc-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                nameChangeLimitReached 
                                  ? "bg-destructive/10 text-destructive border-destructive/20" 
                                  : "bg-primary/10 text-primary border-primary/20"
                              )}>
                                {nameChangeLimitReached ? "LIMIT REACHED" : `${nameChangesLeft} CHANGES LEFT`}
                              </span>
                            </div>
                            <div className="relative group">
                              <Input
                                id="acc-name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                readOnly={nameChangeLimitReached}
                                className={cn(
                                  "h-11 rounded-xl bg-muted/30 focus:bg-background transition-all duration-300",
                                  nameChangeLimitReached && "opacity-60 cursor-not-allowed"
                                )}
                              />
                              <User className="absolute right-3 top-3 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Email Address</Label>
                              <Input value={user?.email ?? ""} readOnly className="h-11 rounded-xl bg-muted/60 text-muted-foreground/70 border-dashed cursor-not-allowed select-none" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">User Role</Label>
                              <div className="h-11 rounded-xl bg-muted/60 flex items-center px-3 border border-dashed text-sm font-medium text-muted-foreground/70">
                                {formatRole(userProfile?.role)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section>
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        Password & Authentication
                      </h3>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="cur-pw" className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Current Password</Label>
                          <div className="relative group">
                            <Input
                              id="cur-pw"
                              type="password"
                              placeholder="••••••••"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="h-11 rounded-xl bg-muted/30 focus:bg-background transition-all duration-300"
                            />
                            <Key className="absolute right-3 top-3 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-pw" className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">New Password</Label>
                            <Input
                              id="new-pw"
                              type="password"
                              placeholder="••••••••"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="h-11 rounded-xl bg-muted/30 focus:bg-background transition-all duration-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirm-pw" className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Confirm New Password</Label>
                            <Input
                              id="confirm-pw"
                              type="password"
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={cn(
                                "h-11 rounded-xl bg-muted/30 focus:bg-background transition-all duration-300",
                                passwordMismatch && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                          </div>
                        </div>

                        {passwordMismatch && (
                          <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20 animate-in fade-in zoom-in duration-200">
                            <AlertCircle className="w-3 h-3" /> Passwords do not match
                          </div>
                        )}
                        
                        {passwordMsg && (
                          <div className={cn(
                            "flex items-center gap-3 p-3 rounded-lg text-sm font-medium border animate-in fade-in zoom-in duration-300",
                            passwordMsg.type === "success" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}>
                            {passwordMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {passwordMsg.text}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Sticky Action Footer */}
            <footer className="p-6 bg-muted/10 border-t border-border/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex-1 mr-4">
                {activeTab === "general" && profileMsg && (
                  <p className={cn(
                    "text-xs font-bold transition-all duration-300",
                    profileMsg.type === "success" ? "text-emerald-500" : "text-destructive"
                  )}>
                    {profileMsg.text}
                  </p>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  className="rounded-lg h-10 font-bold"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                {activeTab === "general" ? (
                  <Button
                    className="h-10 px-8 rounded-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95"
                    onClick={handleUpdateProfile}
                    disabled={saving || !fullName.trim() || nameChangeLimitReached}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                ) : (
                  <Button
                    className="h-10 px-8 rounded-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95"
                    onClick={handleChangePassword}
                    disabled={saving || !currentPassword || !newPassword || !confirmPassword || passwordMismatch}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                    Update Security
                  </Button>
                )}
              </div>
            </footer>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}

