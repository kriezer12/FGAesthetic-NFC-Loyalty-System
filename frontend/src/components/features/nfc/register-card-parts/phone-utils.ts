function stripSpaces(value: string): string {
  return value.replace(/\s/g, "")
}

export function formatPhilippinePhone(raw: string): string {
  const stripped = stripSpaces(raw)

  let normalized = stripped
  if (/^09\d{9}$/.test(stripped)) {
    normalized = "+63" + stripped.slice(1)
  }

  // Formatter
  if (/^\+63\d{10}$/.test(normalized)) {
    const digits = normalized.slice(3) // remove +63
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  return raw
}

export function formatPhoneLiveInput(raw: string): string {
  const stripped = stripSpaces(raw)
  
  // If empty, return empty
  if (stripped.length === 0) return ""
  
  // Format 09XX XXX XXXX (11 digits starting with 0)
  if (stripped.startsWith("09")) {
    if (stripped.length <= 4) {
      return stripped
    } else if (stripped.length <= 7) {
      return `${stripped.slice(0, 4)} ${stripped.slice(4)}`
    } else {
      return `${stripped.slice(0, 4)} ${stripped.slice(4, 7)} ${stripped.slice(7, 11)}`
    }
  }
  
  // Format +63 9XX XXX XXXX (13 characters starting with +63)
  if (stripped.startsWith("+63")) {
    const digits = stripped.slice(3)
    if (digits.length === 0) {
      return "+63"
    } else if (digits.length <= 3) {
      return `+63 ${digits}`
    } else if (digits.length <= 6) {
      return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`
    } else {
      return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
    }
  }
  
  // If user types "9" followed by at least 2 more digits, auto-prefix with "0"
  if (/^9\d{2,}/.test(stripped)) {
    const withPrefix = "0" + stripped
    if (withPrefix.length <= 4) {
      return withPrefix
    } else if (withPrefix.length <= 7) {
      return `${withPrefix.slice(0, 4)} ${withPrefix.slice(4)}`
    } else {
      return `${withPrefix.slice(0, 4)} ${withPrefix.slice(4, 7)} ${withPrefix.slice(7, 11)}`
    }
  }
  
  // Otherwise return stripped as-is to allow user to type freely
  return stripped
}

export function validatePhilippinePhone(value: string): string | null {
  const stripped = stripSpaces(value)

  if (!stripped) return "Phone number is required"

  if (/^09\d{9}$/.test(stripped)) return null       
  if (/^\+63\d{10}$/.test(stripped)) return null     

  if (stripped.startsWith("+63")) {
    return "Must be 13 characters: +63 9XX XXX XXXX"
  }
  if (stripped.startsWith("0")) {
    return "Must be 11 digits: 09XX XXX XXXX"
  }
  return "Use +63 9XX XXX XXXX or 09XX XXX XXXX"
}

export function isAllowedPhoneKey(key: string): boolean {
  return /^[\d\s+]$/.test(key) || key.length > 1 
}
