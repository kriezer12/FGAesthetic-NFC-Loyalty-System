type RegisterCardErrorProps = {
  error: string | null
}

export function RegisterCardError({ error }: RegisterCardErrorProps) {
  if (!error) {
    return null
  }

  return (
    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
      {error}
    </div>
  )
}
