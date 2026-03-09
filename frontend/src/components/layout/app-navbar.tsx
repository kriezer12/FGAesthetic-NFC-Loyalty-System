import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Clock, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { AddAccountModal } from "@/components/features/accounts"
import { NavbarLogo } from "./navbar/navbar-logo"
import { NavbarLinks } from "./navbar/navbar-links"
import { NavbarSettingsButton } from "./navbar/navbar-settings-button"
import { NavbarProfileMenu } from "./navbar/navbar-profile-menu"

export function AppNavbar() {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [addAccountOpen, setAddAccountOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate("/login")
  }

  const userEmail = user?.email ?? ""

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 gap-6">
          <NavbarLogo />
          <NavbarLinks />

          <div className="flex items-center gap-4 ml-auto">
            {userProfile && ["super_admin", "branch_admin"].includes(userProfile.role) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddAccountOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Add Account</span>
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold tabular-nums">{timeStr}</span>
                <span className="text-xs text-muted-foreground">{dateStr}</span>
              </div>
            </div>
            <NavbarSettingsButton />
            <NavbarProfileMenu userEmail={userEmail} onLogout={handleLogout} />
          </div>
        </div>
      </header>
      <AddAccountModal open={addAccountOpen} onOpenChange={setAddAccountOpen} />
    </>
  )
}
