import { NavLink } from "react-router-dom"

export function NavbarLogo() {
  return (
    <NavLink
      to="/dashboard"
      className="flex items-center shrink-0 mr-2"
    >
      <img src="/logo/logo.png" alt="FG Aesthetic" className="h-10 w-auto invert" />
    </NavLink>
  )
}
