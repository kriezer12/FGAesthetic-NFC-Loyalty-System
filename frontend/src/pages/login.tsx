/**
 * Login Page
 * ==========
 *
 * Centered card layout (login-04 style) with animated Plasma background
 */

import { useEffect } from "react"
import { LoginForm } from "@/components/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Plasma } from "@/components/ui/plasma"

export default function LoginPage() {
  useEffect(() => {
    document.title = "Login - FG Aesthetic Centre"
  }, [])

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-black p-6 md:p-10">
      {/* Animated Plasma Background */}
      <div className="absolute inset-0 z-0">
        <Plasma
          color="#808080"
          speed={0.6}
          direction="forward"
          scale={1.1}
          opacity={0.8}
          mouseInteractive={false}
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Card className="overflow-hidden p-0 border-border/40 bg-background/85 backdrop-blur-xl shadow-2xl">
          <CardContent className="grid p-0 md:grid-cols-1">
            <div className="p-6 md:p-8">
              {/* Company Logo & Name */}
              <div className="flex justify-center gap-3 mb-8">
                <a href="#" className="flex items-center gap-3">
                  <img src="/logo/logo-orig.svg" alt="FG Aesthetic Centre Logo" className="h-10 w-auto" loading="lazy" />
                  <span className="font-manrope font-medium text-lg tracking-wide">FG AESTHETIC CENTRE</span>
                </a>
              </div>

              {/* Login Form */}
              <LoginForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
