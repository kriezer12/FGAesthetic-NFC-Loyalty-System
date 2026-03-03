import { NavLink } from "react-router-dom"

const navLinks = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "NFC Scanner", url: "/dashboard/scan" },
  { title: "Customers", url: "/dashboard/customers" },
  { title: "Check-in Logs", url: "/dashboard/checkin-logs" },
  { title: "Appointments", url: "/dashboard/appointments" },
  { title: "Upload", url: "/dashboard/upload" },
]

export function NavbarLinks() {
  return (
    <nav className="hidden md:flex items-center gap-1 flex-1">
      {navLinks.map((link) => (
        <NavLink
          key={link.url}
          to={link.url}
          end={link.url === "/dashboard"}
          className={({ isActive }) =>
            [
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            ].join(" ")
          }
        >
          {link.title}
        </NavLink>
      ))}
    </nav>
  )
}
