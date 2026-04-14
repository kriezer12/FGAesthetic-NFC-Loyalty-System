import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Calendar, Clock, History, ChevronRight } from "lucide-react"

export default function PortalDashboard() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const [customerData, setCustomerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = "Portal - FG Aesthetic Centre"
  }, [])

  useEffect(() => {
    async function loadCustomerDashboard() {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setCustomerData(data)
        }
      } catch (err) {
        console.error("Failed to load customer profile", err)
      } finally {
        setLoading(false)
      }
    }

    loadCustomerDashboard()
  }, [user])

  const firstName = customerData?.first_name || userProfile?.full_name?.split(" ")[0] || "Guest"

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse mt-8">
        <div className="h-8 w-64 bg-muted rounded-md" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-40 bg-muted border rounded-xl" />
          <div className="h-40 bg-muted border rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2 sm:pt-4 px-0">
      
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between px-4 sm:px-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
            Welcome back, {firstName}! 
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Here's your personal overview.</p>
        </div>
        <Button 
          onClick={() => navigate("/portal/appointments")}
          className="w-full sm:w-auto shadow-md shrink-0"
        >
          <Calendar className="h-4 w-4 mr-1 sm:mr-2" /> 
          <span className="hidden sm:inline">Book Appointment</span>
          <span className="sm:hidden">Book</span>
        </Button>
      </div>

      {/* Stats / Highlight Cards */}
      <div className="px-4 sm:px-0">
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        
          {/* Points Card */}
          <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-md">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center text-primary font-semibold text-base sm:text-lg">
                <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Loyalty Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground">
                {customerData?.points || 0}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                Ready to redeem on your next visit!
              </p>
            </CardContent>
          </Card>

          {/* Next Appointment Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center text-foreground font-semibold text-base sm:text-lg">
                <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" /> Up Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Placeholder for no upcoming appointments */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 text-center border-2 border-dashed rounded-lg bg-muted/30">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">No upcoming appointments</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Visits Card (Desktop stretch or normal) */}
          <Card className="shadow-md md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center text-foreground font-semibold text-base sm:text-lg">
                <History className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" /> Visit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                {customerData?.visits || 0}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Lifelong check-ins</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity or Quick Links */}
      <div className="px-4 sm:px-0">
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your latest branch check-ins and point earnings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
                No recent activity recorded yet.
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button variant="ghost" className="w-full justify-between text-xs sm:text-sm" disabled >
                View Full History <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">My Treatments</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Active packages and session history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
                No active treatment packages.
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20">
              <Button variant="ghost" className="w-full justify-between text-xs sm:text-sm" disabled>
                View Treatments <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

