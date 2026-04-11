import { useNavigate, NavLink } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { Menu, Home, Calendar, Clock, History, User, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function PortalNavbar() {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate("/login")
  }

  const userEmail = user?.email ?? ""
  const displayName = userProfile?.full_name || userEmail.split("@")[0] || "Guest"
  const userInitial = displayName.charAt(0).toUpperCase()

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-2 relative z-10">
          <NavLink to="/portal/dashboard" className="flex items-center shrink-0 gap-5 group">
            <img
              src="/logo/logo-orig.svg"
              alt="FG Aesthetic Centre"
              className="h-10 w-auto dark:invert animate-in fade-in zoom-in duration-700 ease-out"
            />
            <span
              className="font-light whitespace-nowrap animate-in fade-in slide-in-from-left-8 duration-1000 delay-300 fill-mode-both"
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "18px",
              }}
            >
              FG AESTHETIC CENTRE
            </span>
          </NavLink>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Hamburger Menu on the right */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted h-10 w-10 md:h-11 md:w-11">
                <Menu className="!h-6 !w-6 md:!h-[26px] md:!w-[26px]" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 flex flex-col border-l">
              <SheetHeader className="p-6 border-b bg-muted/20 text-left">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col overflow-hidden">
                    <SheetTitle className="truncate font-semibold text-foreground tracking-tight text-lg">
                      {displayName}
                    </SheetTitle>
                    <p className="truncate text-sm text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Navigation
                </div>
                
                <NavLink 
                  to="/portal/dashboard" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isActive 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "text-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  <Home className="h-[18px] w-[18px]" /> Dashboard
                </NavLink>
                
                <NavLink 
                  to="/portal/appointments" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isActive 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "text-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  <Calendar className="h-[18px] w-[18px]" /> My Appointments
                </NavLink>
                
                <NavLink 
                  to="/portal/history" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isActive 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "text-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  <History className="h-[18px] w-[18px]" /> Visit History
                </NavLink>

                <div className="h-px bg-border my-4" />
                
                <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account
                </div>

                <NavLink 
                  to="/portal/settings" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isActive 
                        ? "bg-primary/10 text-primary shadow-sm" 
                        : "text-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  <Settings className="h-[18px] w-[18px]" /> Settings
                </NavLink>
              </div>

              <div className="p-4 border-t bg-muted/10 mt-auto">
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-medium text-destructive bg-destructive/10 transition-colors hover:bg-destructive hover:text-destructive-foreground rounded-xl"
                >
                  <LogOut className="h-[18px] w-[18px]" /> Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
