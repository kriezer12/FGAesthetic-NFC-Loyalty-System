import { AlertTriangle } from "lucide-react"

type CustomerAllergiesAlertProps = {
  allergies?: string | null
}

export function CustomerAllergiesAlert({ allergies }: CustomerAllergiesAlertProps) {
  if (!allergies) {
    return null
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border bg-destructive/10 border-destructive/30 dark:bg-destructive/20 dark:border-destructive/40">
      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-destructive">Allergies</p>
        <p className="text-sm text-destructive/80 whitespace-pre-wrap">{allergies}</p>
      </div>
    </div>
  )
}
