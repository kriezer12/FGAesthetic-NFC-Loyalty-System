/**
 * Signup Page
 * ===========
 *
 * Two-column layout with cover image (signup-02 style)
 */

import { useEffect } from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { SignupForm } from "@/components/auth"

export default function SignupPage() {
  useEffect(() => {
    document.title = "Sign Up - FG Aesthetic Centre"
  }, [])

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            FG Aesthetic Centre
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1629909615184-74f495363b67?q=80&w=2069&auto=format&fit=crop"
          alt="Beauty aesthetic treatment"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
