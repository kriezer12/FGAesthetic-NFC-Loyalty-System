import { NavLink } from "react-router-dom"
import { LayoutDashboard, Smartphone, Users, Calendar } from "lucide-react"

const navLinks: { title: string; url: string; icon: typeof LayoutDashboard; roles?: string[] }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "NFC Scanner", url: "/dashboard/scan", icon: Smartphone },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Appointments", url: "/dashboard/appointments", icon: Calendar },
]

export function NavbarLinks() {
  return (
    <nav className="flex items-center gap-1.5 flex-1">
      {navLinks.map((link) => {
        const Icon = link.icon
        return (
          <NavLink
            key={link.url}
            to={link.url}
            end={link.url === "/dashboard"}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group",
                isActive
                  ? "bg-amber-100/50 text-amber-900 shadow-sm ring-1 ring-amber-200"
                  : "text-muted-foreground hover:text-amber-900 hover:bg-amber-50/50",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{link.title}</span>
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400/60 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
          </NavLink>
        )
      })}
    </nav>
  )
}
