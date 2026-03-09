import { NavLink, useLocation } from "react-router-dom"
import { LayoutDashboard, Smartphone, Users, ClipboardList, Calendar, Upload, Briefcase, Settings, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const navLinks: { title: string; url: string; icon: typeof LayoutDashboard; roles?: string[] }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "NFC Scanner", url: "/dashboard/scan", icon: Smartphone },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Appointments", url: "/dashboard/appointments", icon: Calendar },
  { title: "Upload", url: "/dashboard/upload", icon: Upload },
]

const adminLinks: { title: string; url: string; icon: typeof LayoutDashboard }[] = [
  { title: "Check-in Logs", url: "/dashboard/checkin-logs", icon: ClipboardList },
  { title: "Treatments", url: "/dashboard/treatments", icon: Briefcase },
]

export function NavbarLinks() {
  const { userProfile } = useAuth()
  const location = useLocation()

  const visibleLinks = navLinks.filter((link) =>
    !link.roles || (userProfile && link.roles.includes(userProfile.role))
  )

  const isAdminActive = adminLinks.some((l) => location.pathname.startsWith(l.url))

  return (
    <nav className="flex items-center gap-2 flex-1">
      {visibleLinks.map((link) => {
        const Icon = link.icon
        return (
          <NavLink
            key={link.url}
            to={link.url}
            end={link.url === "/dashboard"}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{link.title}</span>
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </NavLink>
        )
      })}

      {/* Administration dropdown on hover */}
      <div className="relative group/admin">
        <button
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
            isAdminActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
          ].join(" ")}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden lg:inline">Administration</span>
          <ChevronDown className="h-3 w-3 hidden lg:inline" />
        </button>
        <div className="absolute top-full left-0 pt-1 invisible opacity-0 group-hover/admin:visible group-hover/admin:opacity-100 transition-all duration-200 z-50">
          <div className="bg-popover border rounded-lg shadow-md p-1 min-w-[180px]">
            {adminLinks.map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.url}
                  to={link.url}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                    ].join(" ")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {link.title}
                </NavLink>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
