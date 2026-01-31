import * as React from "react"
import {
  CreditCard,
  Home,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  Building2,
  Shield,
  UserCog,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import type { Permission } from "@/types/auth"

interface NavItem {
  title: string
  icon: React.ElementType
  url: string
  /** Permissions required (any of these) */
  permissions?: Permission[]
}

// Main navigation items available to all authenticated users
const navMain: NavItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/dashboard",
  },
  {
    title: "NFC Scanner",
    icon: CreditCard,
    url: "/dashboard/scan",
    permissions: ["checkins:create"],
  },
  {
    title: "Customers",
    icon: Users,
    url: "/dashboard/customers",
    permissions: ["customers:read"],
  },
  {
    title: "Check-in Logs",
    icon: ClipboardList,
    url: "/dashboard/checkin-logs",
    permissions: ["checkins:read"],
  },
]

// Admin navigation items (super_admin and branch_admin)
const navAdmin: NavItem[] = [
  {
    title: "User Management",
    icon: UserCog,
    url: "/dashboard/users",
    permissions: ["users:read"],
  },
  {
    title: "Branches",
    icon: Building2,
    url: "/dashboard/branches",
    permissions: ["branches:create", "branches:update"],
  },
]

// Super admin only items
const navSuperAdmin: NavItem[] = [
  {
    title: "System Settings",
    icon: Shield,
    url: "/dashboard/system-settings",
    permissions: ["settings:update"],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { hasAnyPermission, role, profile, profileLoading } = useAuth()
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // Filter nav items based on permissions
  // While profile is loading, show all items without permission requirements
  const filterNavItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.permissions) return true
      // If still loading profile, hide permission-gated items
      if (profileLoading || !profile) return false
      return hasAnyPermission(item.permissions)
    })
  }

  // Show all main items only after profile loads
  const mainItems = profileLoading ? navMain.filter(i => !i.permissions) : filterNavItems(navMain)
  const adminItems = profileLoading ? [] : filterNavItems(navAdmin)
  const superAdminItems = profileLoading ? [] : filterNavItems(navSuperAdmin)

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">FG Aesthetic</span>
            <span className="text-xs text-muted-foreground">NFC Loyalty</span>
          </div>
        </div>
        {/* User info */}
        {profile && (
          <div className="px-4 pb-2">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {role?.replace('_', ' ')}
            </p>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Super Admin Navigation */}
        {superAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
