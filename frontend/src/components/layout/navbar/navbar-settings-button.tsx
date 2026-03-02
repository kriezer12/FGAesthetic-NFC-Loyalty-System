import { NavLink } from "react-router-dom"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NavbarSettingsButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className="text-muted-foreground hover:text-foreground"
    >
      <NavLink to="/dashboard/settings">
        <Settings className="h-5 w-5" />
        <span className="sr-only">Settings</span>
      </NavLink>
    </Button>
  )
}
