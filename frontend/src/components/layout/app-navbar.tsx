import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Clock, Plus, ShoppingCart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { AddAccountModal } from "@/components/features/accounts"
import { NavbarLogo } from "./navbar/navbar-logo"
import { NavbarLinks } from "./navbar/navbar-links"
import { NavbarAdminDropdown } from "./navbar/navbar-admin-dropdown"
import { NavbarNotificationBell } from "./navbar/navbar-notification-bell"
import { NavbarProfileMenu } from "./navbar/navbar-profile-menu"
import { AnnouncementCreatorModal } from "@/components/features/admin/announcement-creator"
import { Megaphone } from "lucide-react"

export function AppNavbar() {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [isAddButtonHovered, setIsAddButtonHovered] = useState(false)
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)

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
      <style>{`
        @keyframes sliceIn {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes sliceOut {
          from {
            clip-path: inset(0 0 0 0);
          }
          to {
            clip-path: inset(0 100% 0 0);
          }
        }
        .add-account-text-animate {
          animation: sliceIn 0.6s ease-out forwards;
        }
        .add-account-text-reverse {
          animation: sliceOut 0.6s ease-out forwards;
        }
        @keyframes backgroundPulse {
          0% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0.3;
          }
        }
        .add-account-gradient {
          position: relative;
        }
        .add-account-gradient::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(128, 128, 128, 0.2), rgba(255, 255, 255, 0.4), rgba(128, 128, 128, 0.2));
          border-radius: inherit;
          animation: backgroundPulse 2s ease-in-out infinite;
          pointer-events: none;
          z-index: -1;
        }
      `}</style>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 gap-6">
          <NavbarLogo />
          <NavbarLinks />

          <div className="flex items-center gap-4 ml-auto">
            {userProfile && ["super_admin", "branch_admin"].includes(userProfile.role) && (
              <div className="flex items-center gap-1">
                {userProfile.role === "super_admin" && (
                  <button
                    onClick={() => setAnnouncementModalOpen(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                    title="Broadcast Announcement"
                  >
                    <Megaphone className="h-5 w-5" />
                  </button>
                )}
                <NavbarAdminDropdown />
                <button
                  onClick={() => setAddAccountOpen(true)}
                  onMouseEnter={() => setIsAddButtonHovered(true)}
                  onMouseLeave={() => setIsAddButtonHovered(false)}
                  className={`hidden md:flex items-center gap-2 text-primary transition-all duration-300 px-3 py-1.5 rounded-lg ${
                    isAddButtonHovered ? "gap-3 add-account-gradient" : "gap-2"
                  }`}
                >
                  <Plus className="h-5 w-5 shrink-0" />
                  {isAddButtonHovered && (
                    <span
                      className="text-sm font-semibold whitespace-nowrap add-account-text-animate"
                    >
                      Add Account
                    </span>
                  )}
                </button>
              </div>
            )}
            <NavbarNotificationBell />
            <button
              onClick={() => navigate("/dashboard/checkout")}
              className="relative flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
              title="Checkout"
              aria-label="Go to checkout"
            >
              <ShoppingCart className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold tabular-nums">{timeStr}</span>
                <span className="text-xs text-muted-foreground">{dateStr}</span>
              </div>
            </div>
            <NavbarProfileMenu userEmail={userEmail} onLogout={handleLogout} />
          </div>
        </div>
      </header>
      <AddAccountModal open={addAccountOpen} onOpenChange={setAddAccountOpen} />
      <AnnouncementCreatorModal open={announcementModalOpen} onOpenChange={setAnnouncementModalOpen} />
    </>
  )
}
