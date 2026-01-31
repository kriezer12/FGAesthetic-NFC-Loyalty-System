import { useEffect, useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCounter } from "@/hooks/use-counter"

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCards: 0,
    totalVisits: 0,
    recentActivity: 0
  })
  const [loading, setLoading] = useState(true)

  const totalCustomersCount = useCounter(stats.totalCustomers, 1500)
  const activeCardsCount = useCounter(stats.activeCards, 1500)
  const totalVisitsCount = useCounter(stats.totalVisits, 1500)
  const recentActivityCount = useCounter(stats.recentActivity, 1500)

  useEffect(() => {
    document.title = "Dashboard - FG Aesthetic Centre"
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      const { count: activeCardCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .not('nfc_uid', 'is', null)

      const { data: visitsData } = await supabase
        .from('customers')
        .select('visits')
      
      const totalVisits = visitsData?.reduce((sum, customer) => sum + (customer.visits || 0), 0) || 0

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { count: recentCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('last_visit', sevenDaysAgo.toISOString())

      setStats({
        totalCustomers: customerCount || 0,
        activeCards: activeCardCount || 0,
        totalVisits: totalVisits,
        recentActivity: recentCount || 0
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">
                Welcome to FG Aesthetic NFC Loyalty System
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Customers
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : totalCustomersCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registered in system
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Cards
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : activeCardsCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    NFC cards registered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Visits
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : totalVisitsCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All-time customer visits
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recent Activity
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : recentActivityCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active in last 7 days
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <a 
                    href="/dashboard/scan" 
                    className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Scan NFC Card</div>
                      <div className="text-sm text-muted-foreground">Register or check customer</div>
                    </div>
                  </a>
                  <a 
                    href="/dashboard/customers" 
                    className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <Users className="h-5 w-5" />
                    <div>
                      <div className="font-medium">View Customers</div>
                      <div className="text-sm text-muted-foreground">Browse customer database</div>
                    </div>
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <span className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      Online
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">NFC Scanner</span>
                    <span className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Version</span>
                    <span className="text-sm text-muted-foreground">v1.0.0</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
