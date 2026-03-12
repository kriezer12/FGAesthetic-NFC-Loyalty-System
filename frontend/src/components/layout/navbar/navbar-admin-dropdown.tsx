import { NavLink, useLocation } from "react-router-dom"
import { ChevronDown } from "lucide-react"

const adminLinks: { title: string; url: string }[] = [
  { title: "Manage Accounts", url: "/dashboard/accounts" },
  { title: "Check-in Logs", url: "/dashboard/checkin-logs" },
  { title: "Treatments", url: "/dashboard/treatments" },
  { title: "Loyalty Admin", url: "/dashboard/loyalty" },
]

export function NavbarAdminDropdown() {
  const location = useLocation()

  const isAdminActive = adminLinks.some((l) => location.pathname.startsWith(l.url))

  return (
    <div className="relative group/admin">
      <button
        className={[
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.95rem] font-medium transition-all duration-200 cursor-pointer",
          isAdminActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
        ].join(" ")}
      >
        <span>Administration</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      <div className="absolute top-full left-0 pt-1 invisible opacity-0 group-hover/admin:visible group-hover/admin:opacity-100 transition-all duration-200 z-50">
        <div className="bg-popover border rounded-lg shadow-md p-1 min-w-[180px]">
          {adminLinks.map((link) => {
            return (
              <NavLink
                key={link.url}
                to={link.url}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-[0.95rem] font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                  ].join(" ")
                }
              >
                {link.title}
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}
