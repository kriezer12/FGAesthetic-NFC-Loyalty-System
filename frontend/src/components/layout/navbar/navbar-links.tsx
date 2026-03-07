import { NavLink } from "react-router-dom"
import { LayoutDashboard, Smartphone, Users, LogIn, Calendar, Upload } from "lucide-react"

const navLinks = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "NFC Scanner", url: "/dashboard/scan", icon: Smartphone },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Check-in Logs", url: "/dashboard/checkin-logs", icon: LogIn },
  { title: "Appointments", url: "/dashboard/appointments", icon: Calendar },
  { title: "Upload", url: "/dashboard/upload", icon: Upload },
]

export function NavbarLinks() {
  return (
    <nav className="flex items-center gap-2 flex-1">
      {navLinks.map((link) => {
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
    </nav>
  )
}
