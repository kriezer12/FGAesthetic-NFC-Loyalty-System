import { useState, useEffect } from "react"
import { LogOut, Settings, User, Sun, Moon, Bell } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getAvatarSignedUrl } from "@/lib/supabase-storage"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { AccountSettingsModal } from "./account-settings-modal"
import { NotificationSettingsModal } from "./notification-settings-modal"

type NavbarProfileMenuProps = {
  userEmail: string
  onLogout: () => void
}

export function NavbarProfileMenu({ userEmail, onLogout }: NavbarProfileMenuProps) {
  const { userProfile } = useAuth()
  const displayName = userProfile?.full_name || userEmail.split("@")[0]
  const userInitial = (userProfile?.full_name || userEmail).charAt(0).toUpperCase()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Convert public avatar URL to signed URL immediately for faster display
  useEffect(() => {
    const generateAvatarUrl = async () => {
      if (userProfile?.avatar_url && userProfile.avatar_url.includes("user-pictures")) {
        try {
          const pathMatch = userProfile.avatar_url.match(/user-pictures\/(.*?)(\?|$)/)
          if (pathMatch) {
            const path = pathMatch[1]
            // Generate signed URL with longer expiration (8 hours)
            const signedUrl = await getAvatarSignedUrl("user-pictures", path, 28800)
            setAvatarUrl(signedUrl || userProfile.avatar_url)
          }
        } catch (error) {
          console.error("Error fetching signed URL:", error)
          setAvatarUrl(userProfile.avatar_url)
        }
      } else {
        setAvatarUrl(userProfile?.avatar_url || null)
      }
    }
    
    generateAvatarUrl()
  }, [userProfile?.avatar_url])
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  )

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full p-0 text-muted-foreground hover:text-foreground"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {userInitial || <User className="h-4 w-4" />}
            </div>
          )}
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setNotifSettingsOpen(true)} className="cursor-pointer">
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setIsDark(!isDark)} className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {isDark ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              <span className="pl-2">Theme</span>
            </div>
            <div className={`flex items-center w-10 h-6 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform flex items-center justify-center ${isDark ? "translate-x-4" : "translate-x-0"}`}>
                {isDark ? (
                  <Moon className="h-3 w-3 text-slate-500" />
                ) : (
                  <Sun className="h-3 w-3 text-yellow-500" />
                )}
              </div>
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <AccountSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    <NotificationSettingsModal open={notifSettingsOpen} onOpenChange={setNotifSettingsOpen} />
    </>
  )
}
