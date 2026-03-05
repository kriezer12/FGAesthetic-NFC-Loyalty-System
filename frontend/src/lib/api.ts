/**
 * API Configuration and Utilities
 * ==============================
 *
 * Provides a centralized API client for making requests to the backend.
 */

const getApiBaseUrl = (): string => {
  return ""
}

export const API_BASE_URL = getApiBaseUrl()

/**
 * Make a request to the backend API.
 *
 * @param endpoint 
 * @param options 
 * @returns 
 */
export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`
  
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })
}
