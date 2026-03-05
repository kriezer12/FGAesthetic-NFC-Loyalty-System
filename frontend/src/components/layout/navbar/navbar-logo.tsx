import { NavLink } from "react-router-dom"
import { useState } from "react"

export function NavbarLogo() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <>
      <style>{`
        @keyframes sliceIn {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        .navbar-text-animate {
          animation: sliceIn 0.6s ease-out forwards;
        }
      `}</style>
      <NavLink
        to="/dashboard"
        className={`flex items-center shrink-0 transition-all duration-300 ${
          isHovered ? "gap-5 mr-1" : "gap-0 mr-0"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src="/logo/logo-orig.svg"
          alt="FG Aesthetic Centre"
          className="h-10 w-auto transition duration-300 dark:invert"
        />
        
        {isHovered && (
          <span
            className="font-light whitespace-nowrap navbar-text-animate"
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "18px",
            }}
          >
            FG AESTHETIC CENTRE
          </span>
        )}
      </NavLink>
    </>
  )
}
