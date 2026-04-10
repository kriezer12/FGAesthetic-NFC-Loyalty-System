import { Loader2, UserPlus } from "lucide-react"

type RegisterCardFooterActionsProps = {
  isLoading: boolean
  onCancel: () => void
}

export function RegisterCardFooterActions({ isLoading, onCancel }: RegisterCardFooterActionsProps) {
  return (
    <div
      className="flex gap-3 px-6 py-4 border-t"
      style={{ background: "oklch(0.97 0.01 78 / 40%)" }}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1 h-10 rounded-lg text-sm font-medium border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: "oklch(0.78 0.08 78 / 40%)",
          color: "oklch(0.40 0 0)",
          background: "transparent",
        }}
        onMouseEnter={e => {
          if (!isLoading) {
            (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.93 0.03 78 / 50%)"
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent"
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm animate-[gradient-move_10s_ease-in-out_infinite]"
        style={{
          background: isLoading
            ? "oklch(0.94 0.03 78)"
            : "linear-gradient(270deg, oklch(0.97 0.02 78), oklch(0.92 0.06 78), oklch(0.98 0.01 78), oklch(0.97 0.02 78))",
          backgroundSize: "300% 300%",
          color: "oklch(0.20 0 0)",
          border: "1px solid oklch(0.88 0.06 78 / 60%)"
        }}
        onMouseEnter={e => {
          if (!isLoading) {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px oklch(0.92 0.06 78 / 50%)"
          }
        }}
        onMouseLeave={e => {
          if (!isLoading) {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"
          }
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Registering...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Register Client
          </>
        )}
      </button>
    </div>
  )
}
