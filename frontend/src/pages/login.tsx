/**
 * Login Page
 * ==========
 *
 * Two-column layout with cover image (login-02 style)
 */

import { useEffect } from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/auth"

export default function LoginPage() {
  useEffect(() => {
    document.title = "Login - FG Aesthetic Centre"
  }, [])

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <img src="/logo/logo-black.png" alt="FG Aesthetic Centre Logo" className="h-6" />
            FG Aesthetic Centre
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2068&auto=format&fit=crop"
          alt="Beauty aesthetic clinic interior"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
