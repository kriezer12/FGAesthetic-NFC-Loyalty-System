import { useState, useEffect } from "react"
import { LogOut, Settings, User } from "lucide-react"
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

type NavbarProfileMenuProps = {
  userEmail: string
  onLogout: () => void
}

export function NavbarProfileMenu({ userEmail, onLogout }: NavbarProfileMenuProps) {
  const { userProfile } = useAuth()
  const displayName = userProfile?.full_name || userEmail.split("@")[0]
  const userInitial = (userProfile?.full_name || userEmail).charAt(0).toUpperCase()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Convert public avatar URL to signed URL to bypass CORS
  useEffect(() => {
    if (userProfile?.avatar_url && userProfile.avatar_url.includes("user-pictures")) {
      const fetchSignedUrl = async () => {
        try {
          // Extract path from public URL
          const pathMatch = userProfile.avatar_url.match(/user-pictures\/(.*?)(\?|$)/)
          if (pathMatch) {
            const path = pathMatch[1]
            // Generate signed URL with longer expiration (8 hours)
            const signedUrl = await getAvatarSignedUrl("user-pictures", path, 28800)
            if (signedUrl) {
              setAvatarUrl(signedUrl)
            } else {
              setAvatarUrl(userProfile.avatar_url)
            }
          }
        } catch (error) {
          console.error("Error fetching signed URL:", error)
          setAvatarUrl(userProfile.avatar_url)
        }
      }
      fetchSignedUrl()
    } else {
      setAvatarUrl(userProfile?.avatar_url || null)
    }
  }, [userProfile?.avatar_url])

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
          Account Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <AccountSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
