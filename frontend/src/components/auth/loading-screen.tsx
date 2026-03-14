/**
 * Loading Screen Component
 * ========================
 *
 * Full-screen branded loading screen shown while auth state is being resolved.
 * Features the FG Aesthetic Centre logo with animated entrance and pulse effect,
 * accompanied by the brand name and animated loading dots.
 */

export function LoadingScreen() {
  return (
    <>
      <style>{`
      `}</style>

      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 select-none">

          {/* Brand name */}
          <p
            className="text-foreground font-light text-lg tracking-[0.25em] uppercase"
            style={{ fontFamily: "Satoshi, sans-serif" }}
          >
            FG Aesthetic Centre
          </p>

        </div>
      </div>
    </>
  )
}
