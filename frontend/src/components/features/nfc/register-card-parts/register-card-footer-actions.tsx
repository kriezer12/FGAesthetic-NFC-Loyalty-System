import { Loader2, UserPlus } from "lucide-react"

type RegisterCardFooterActionsProps = {
  isLoading: boolean
  onCancel: () => void
}

export function RegisterCardFooterActions({ isLoading, onCancel }: RegisterCardFooterActionsProps) {
  return (
    <div
      className="flex gap-3 px-6 py-4 border-t bg-muted/20"
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1 flex items-center justify-center h-10 rounded-lg text-sm font-medium border border-input transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-foreground hover:bg-accent"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm bg-primary text-primary-foreground hover:opacity-90"
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
