import { NavLink, useLocation } from "react-router-dom"
import { 
  ChevronDown, 
  Users, 
  FileText, 
  Sparkles, 
  Package, 
  Star, 
  BarChart3, 
  Building2,
  Wrench,
  Calendar
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { BranchManagementModal } from "@/components/features/admin/branch-management-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


interface AdminLink {
  title: string;
  url: string;
  icon: React.ElementType;
}

interface AdminCategory {
  title: string;
  links: AdminLink[];
}

const adminCategories: AdminCategory[] = [
  {
    title: "Accounts",
    links: [
      { title: "Manage Accounts", url: "/dashboard/accounts", icon: Users },
      { title: "User Logs", url: "/dashboard/user-logs", icon: FileText },
    ],
  },
  {
    title: "Services",
    links: [
      { title: "Treatments", url: "/dashboard/treatments", icon: Sparkles },
      { title: "Equipment", url: "/dashboard/equipment", icon: Wrench },
      { title: "Inventory", url: "/dashboard/inventory", icon: Package },
      { title: "Loyalty Admin", url: "/dashboard/loyalty", icon: Star },
    ],
  },
  {
    title: "Business",
    links: [
      { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
      { title: "Appointment Settings", url: "/dashboard/appointments-settings", icon: Calendar },
    ],
  },
]

export function NavbarAdminDropdown() {
  const location = useLocation()
  const { userProfile } = useAuth()
  const [branchModalOpen, setBranchModalOpen] = useState(false)

  const allLinks = adminCategories.flatMap(c => c.links)
  const isAdminActive = allLinks.some((l) => location.pathname.startsWith(l.url))
  const isSuperAdmin = userProfile?.role === "super_admin"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={[
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.95rem] font-medium transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              isAdminActive
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/20 hover:text-foreground focus-visible:bg-primary/20 focus-visible:text-primary",
            ].join(" ")}
            aria-label="Administration Menu"
          >
            <span>Administration</span>
            <ChevronDown className={[
              "h-3.5 w-3.5 transition-transform duration-300",
              "group-data-[state=open]:rotate-180"
            ].join(" ")} />
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="center" className="bg-popover/98 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl p-6 min-w-[680px] z-50">
          <div className="grid grid-cols-3 gap-8 outline-none">
            {adminCategories.map((category, idx) => (
              <div 
                key={category.title} 
                className={[
                  "flex flex-col gap-4 focus-visible:outline-none",
                  idx < 2 ? "border-r border-border/40 pr-8" : ""
                ].join(" ")}
              >
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-2 opacity-60">
                  {category.title}
                </h3>
                <div className="flex flex-col gap-1">
                  {category.links.map((link) => {
                    const Icon = link.icon
                    return (
                      <DropdownMenuItem key={link.url} asChild className="p-0 focus:bg-transparent">
                        <NavLink
                          to={link.url}
                          className={({ isActive }) => [
                            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group/item outline-none",
                            isActive
                              ? "bg-primary/20 text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:text-foreground",
                          ].join(" ")}
                        >
                          {({ isActive }) => (
                            <>
                              <Icon className={[
                                "h-4 w-4 shrink-0 transition-colors duration-200",
                                isActive ? "text-foreground" : "text-muted-foreground/70 group-hover/item:text-foreground group-focus-visible/item:text-foreground"
                              ].join(" ")} />
                              <span>{link.title}</span>
                            </>
                          )}
                        </NavLink>
                      </DropdownMenuItem>
                    )
                  })}
                  
                  {/* Add Branches to the last column if Super Admin */}
                  {idx === 2 && isSuperAdmin && (
                    <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                      <button
                        type="button"
                        onClick={() => setBranchModalOpen(true)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:text-foreground transition-all duration-200 cursor-pointer text-left group/item outline-none w-full"
                        aria-label="Manage Branches"
                      >
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-colors duration-200 group-hover/item:text-foreground group-focus-visible/item:text-foreground" />
                        <span>Branches</span>
                      </button>
                    </DropdownMenuItem>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      
      <BranchManagementModal
        open={branchModalOpen}
        onOpenChange={setBranchModalOpen}
      />
    </>
  )
}
