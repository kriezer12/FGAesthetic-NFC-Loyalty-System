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
    <nav className="flex items-center gap-1 flex-1">
      {navLinks.map((link) => {
        return (
          <NavLink
            key={link.url}
            to={link.url}
            end={link.url === "/dashboard"}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.95rem] font-medium transition-all duration-200 relative group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
              ].join(" ")
            }
          >
            <span className="hidden lg:inline">{link.title}</span>
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </NavLink>
        )
      })}
    </nav>
  )
}
