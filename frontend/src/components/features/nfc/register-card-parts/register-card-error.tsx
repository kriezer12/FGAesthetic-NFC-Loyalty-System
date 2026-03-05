import { AlertCircle } from "lucide-react"

type RegisterCardErrorProps = {
  error: string | null
}

export function RegisterCardError({ error }: RegisterCardErrorProps) {
  if (!error) {
    return null
  }

  return (
    <div className="flex items-start gap-2.5 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  )
}
