import { NavLink } from "react-router-dom"

export function NavbarLogo() {
  return (
    <NavLink
      to="/dashboard"
      className="flex items-center shrink-0 mr-2 gap-2"
    >
      <img src="/logo/logo-orig.svg" alt="FG Aesthetic" className="h-12 w-auto" />
      <span className="font-manrope font-medium text-sm tracking-wide hidden sm:inline">FG AESTHETIC CENTRE</span>
    </NavLink>
  )
}
