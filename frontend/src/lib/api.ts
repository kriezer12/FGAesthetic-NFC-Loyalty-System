/**
 * API Configuration and Utilities
 * ==============================
 *
 * Provides a centralized API client for making requests to the backend.
 */

const getApiBaseUrl = (): string => {
  // Environment variable takes priority
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // In development, use explicit backend URL to avoid proxy issues
  if (import.meta.env.DEV) {
    return "http://localhost:5000/api"
  }
  
  // In production, use relative path (backend serves the SPA)
  return "/api"
}

export const API_BASE_URL = getApiBaseUrl()

interface ApiCallOptions extends RequestInit {
  authToken?: string
}

/**
 * Make a request to the backend API.
 *
 * @param endpoint 
 * @param options 
 * @returns 
 */
export async function apiCall(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Add existing headers
  if (options.headers) {
    if (typeof options.headers === "object" && !(options.headers instanceof Headers)) {
      Object.assign(headers, options.headers)
    }
  }

  // Add Authorization header if authToken is provided
  if (options.authToken) {
    headers["Authorization"] = `Bearer ${options.authToken}`
  }

  const { authToken, ...fetchOptions } = options

  return fetch(url, {
    headers,
    ...fetchOptions,
  })
}
