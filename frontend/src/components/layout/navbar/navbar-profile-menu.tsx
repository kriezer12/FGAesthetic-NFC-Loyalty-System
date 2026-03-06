import { useState } from "react"
import { LogOut, Settings, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
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

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-muted-foreground hover:text-foreground"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {userInitial || <User className="h-4 w-4" />}
          </div>
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
