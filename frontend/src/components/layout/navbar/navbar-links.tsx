import { NavLink } from "react-router-dom"
import { LayoutDashboard, Smartphone, Users, LogIn, Calendar, Upload } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const navLinks = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "NFC Scanner", url: "/dashboard/scan" },
  { title: "Customers", url: "/dashboard/customers" },
  { title: "Check-in Logs", url: "/dashboard/checkin-logs" },
  { title: "Appointments", url: "/dashboard/appointments" },
  { title: "Treatments", url: "/dashboard/treatments" },
  { title: "Upload", url: "/dashboard/upload" },
]

export function NavbarLinks() {
  const { userProfile } = useAuth()

  const visibleLinks = navLinks.filter((link) =>
    !link.roles || (userProfile && link.roles.includes(userProfile.role))
  )

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
    </nav>
  )
}
