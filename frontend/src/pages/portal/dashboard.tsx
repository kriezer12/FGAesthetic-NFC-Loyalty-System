import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Calendar, Clock, History, ChevronRight } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

export default function PortalDashboard() {
  const { user, userProfile } = useAuth()
  const [customerData, setCustomerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCustomerDashboard() {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", user.id)
          .single()
        
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {firstName}! 
          </h1>
          <p className="text-muted-foreground mt-1">Here's your personal overview.</p>
        </div>
        <Button className="w-full md:w-auto shadow-md">
          <Calendar className="mr-2 h-4 w-4" /> Book Appointment
        </Button>
      </div>

      {/* Social / Promotions Carousel Section */}
      <Card className="overflow-hidden border-none shadow-md bg-gradient-to-r from-primary/5 to-transparent relative">
        <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold shadow-lg">
          <Sparkles className="h-4 w-4" /> Featured
        </div>
        <CardContent className="p-0">
          <Carousel 
            className="w-full"
            plugins={[
              Autoplay({
                delay: 4000,
              }),
            ]}
          >
            <CarouselContent>
              {/* Mock FB Image 1 */}
              <CarouselItem>
                <div className="relative aspect-[21/9] sm:aspect-[3/1] bg-muted w-full overflow-hidden flex items-center justify-center">
                  <img src="https://images.unsplash.com/photo-1600334129128-68505432c23e?q=80&w=2000&auto=format&fit=crop" alt="Spa Promotion" className="object-cover w-full h-full hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-6 md:p-10 text-white w-full">
                      <h3 className="text-xl md:text-3xl font-bold mb-2">Summer Glow Package</h3>
                      <p className="text-white/80 text-sm md:text-base max-w-lg">Get that radiant summer skin with our new comprehensive treatment bundle. Book today!</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              {/* Mock FB Image 2 */}
              <CarouselItem>
                <div className="relative aspect-[21/9] sm:aspect-[3/1] bg-muted w-full overflow-hidden flex items-center justify-center">
                  <img src="https://images.unsplash.com/photo-1540555700887-cd13ed158f00?q=80&w=2000&auto=format&fit=crop" alt="Staff Highlight" className="object-cover w-full h-full hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-6 md:p-10 text-white w-full">
                      <h3 className="text-xl md:text-3xl font-bold mb-2">Meet Our New Specialist</h3>
                      <p className="text-white/80 text-sm md:text-base max-w-lg">We are thrilled to welcome Dr. Sarah to the FG Aesthetic Centre family.</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>

              {/* Mock FB Image 3 */}
              <CarouselItem>
                <div className="relative aspect-[21/9] sm:aspect-[3/1] bg-muted w-full overflow-hidden flex items-center justify-center">
                  <img src="https://images.unsplash.com/photo-1614859324967-bdf45d72ca05?q=80&w=2000&auto=format&fit=crop" alt="Treatment Facility" className="object-cover w-full h-full hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-6 md:p-10 text-white w-full">
                      <h3 className="text-xl md:text-3xl font-bold mb-2">State of the Art Facilities</h3>
                      <p className="text-white/80 text-sm md:text-base max-w-lg">Experience the highest standard of care in our newly renovated treatment rooms.</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            {/* Navigation buttons restricted to desktop */}
            <div className="hidden sm:block">
              <CarouselPrevious className="left-4 bg-white/20 hover:bg-white/40 text-white border-none shadow-md" />
              <CarouselNext className="right-4 bg-white/20 hover:bg-white/40 text-white border-none shadow-md" />
            </div>
          </Carousel>
        </CardContent>
      </Card>

      {/* Stats / Highlight Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Points Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-primary font-semibold text-lg">
              <Sparkles className="mr-2 h-5 w-5" /> Loyalty Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-foreground">
              {customerData?.points || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Ready to redeem on your next visit!
            </p>
          </CardContent>
        </Card>

        {/* Next Appointment Card */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-foreground font-semibold text-lg">
              <Clock className="mr-2 h-5 w-5 text-muted-foreground" /> Up Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder for no upcoming appointments */}
            <div className="flex flex-col items-center justify-center p-4 text-center border-2 border-dashed rounded-lg bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground">No upcoming appointments</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Visits Card (Desktop stretch or normal) */}
        <Card className="shadow-md md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-foreground font-semibold text-lg">
              <History className="mr-2 h-5 w-5 text-muted-foreground" /> Visit History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {customerData?.visits || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Lifelong check-ins</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity or Quick Links */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest branch check-ins and point earnings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No recent activity recorded yet.
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20">
            <Button variant="ghost" className="w-full justify-between" disabled >
              View Full History <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>My Treatments</CardTitle>
            <CardDescription>Active packages and session history.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No active treatment packages.
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20">
            <Button variant="ghost" className="w-full justify-between" disabled>
              View Treatments <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

