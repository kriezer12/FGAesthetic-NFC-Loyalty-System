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
          background: linear-gradient(90deg, rgba(251, 191, 36, 0.2), rgba(253, 230, 138, 0.4), rgba(251, 191, 36, 0.2));
          border-radius: inherit;
          animation: backgroundPulse 2s ease-in-out infinite;
          pointer-events: none;
          z-index: -1;
        }
        @keyframes navFloatA {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(8px, -4px) scale(1.02); }
          66%       { transform: translate(-4px, 8px) scale(0.98); }
        }
        @keyframes navFloatB {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40%       { transform: translate(-8px, 4px) scale(1.04); }
          70%       { transform: translate(6px, -3px) scale(0.96); }
        }
        @keyframes navFloatC {
          0%, 100% { transform: translate(0px, 0px); }
          50%       { transform: translate(4px, -4px); }
        }
        @keyframes navShimmerSweep {
          0%   { transform: translateX(-100%); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .nav-float-a { animation: navFloatA 7s ease-in-out infinite; }
        .nav-float-b { animation: navFloatB 9s ease-in-out infinite; animation-delay: -3s; }
        .nav-float-c { animation: navFloatC 5s ease-in-out infinite; animation-delay: -1.5s; }
        .nav-shimmer { animation: navShimmerSweep 4s ease-in-out infinite; animation-delay: 1s; }
      `}</style>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-sm relative">
        {/* Background Effects Container */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]">
          {/* Floating blobs */}
          <div className="nav-float-a absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-2xl" />
          <div className="nav-float-b absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-secondary/30 blur-xl" />
          <div className="nav-float-c absolute left-1/3 -top-6 h-16 w-16 rounded-full bg-primary/20 blur-lg" />
        </div>

        <div className="flex h-16 items-center px-2 sm:px-6 gap-2 sm:gap-6 relative">
          <NavbarLogo />
          <NavbarLinks />

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {userProfile && ["super_admin", "branch_admin"].includes(userProfile.role) && (
              <div className="flex items-center gap-1">
                {userProfile.role === "super_admin" && (
                  <button
                    type="button"
                    onClick={() => setAnnouncementModalOpen(true)}
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 focus-visible:text-primary focus-visible:bg-primary/10 transition-all duration-200"
                    title="Broadcast Announcement"
                    aria-label="Broadcast Announcement"
                  >
                    <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>

                )}
                <NavbarAdminDropdown />
                <button
                  type="button"
                  onClick={() => setAddAccountOpen(true)}
                  onMouseEnter={() => setIsAddButtonHovered(true)}
                  onMouseLeave={() => setIsAddButtonHovered(false)}
                  onFocus={() => setIsAddButtonHovered(true)}
                  onBlur={() => setIsAddButtonHovered(false)}
                  className={`hidden md:flex items-center gap-2 text-muted-foreground transition-all duration-300 px-3 py-1.5 rounded-lg hover:text-primary focus-visible:ring-2 focus-visible:ring-border ${
                    isAddButtonHovered ? "gap-3 add-account-gradient" : "gap-2"
                  }`}
                  aria-label="Add New Account"
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
              type="button"
              onClick={() => navigate("/dashboard/checkout")}
              className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 focus-visible:text-primary focus-visible:bg-primary/10 transition-all duration-200"
              title="Checkout"
              aria-label="Go to checkout"
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-foreground shadow-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
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
