/**
 * Authentication utility functions
 * Manages token storage, validation, refresh, and logout operations
 */

import { config } from "./config"

const API_BASE_URL = config.apiUrl

export interface UserData {
  id: number
  email: string
  first_name: string
  last_name: string
  profile_type?: string
  is_superuser?: boolean
}

export interface AuthTokens {
  access: string
  refresh: string
}

/**
 * Get the access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

/**
 * Get the refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("refresh_token")
}

/**
 * Get user data from localStorage
 */
export function getUserData(): UserData | null {
  if (typeof window === "undefined") return null
  const userData = localStorage.getItem("user_data")
  if (!userData) return null
  try {
    return JSON.parse(userData)
  } catch {
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

/**
 * Store authentication tokens
 */
export function setAuthTokens(tokens: Partial<AuthTokens>): void {
  if (tokens.access) {
    localStorage.setItem("access_token", tokens.access)
  }
  if (tokens.refresh) {
    localStorage.setItem("refresh_token", tokens.refresh)
  }
}

/**
 * Store user data
 */
export function setUserData(userData: UserData): void {
  localStorage.setItem("user_data", JSON.stringify(userData))
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user_data")
}

/**
 * Logout user and redirect to login page
 */
export function logout(): void {
  clearAuthData()
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}

/**
 * Refresh the access token using the refresh token
 * @returns New access token or null if refresh failed
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    console.warn("[Auth] No refresh token available")
    return null
  }

  console.log("[Auth] Attempting to refresh access token...")

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (!response.ok) {
      // Refresh token is invalid or expired
      const errorData = await response.json().catch(() => ({}))
      console.error("[Auth] Token refresh failed:", response.status, errorData)

      // Clear invalid tokens
      clearAuthData()
      return null
    }

    const data = await response.json()

    if (data.access) {
      localStorage.setItem("access_token", data.access)
      console.log("[Auth] Access token refreshed successfully")
      return data.access
    }

    console.error("[Auth] No access token in refresh response")
    return null
  } catch (error) {
    console.error("[Auth] Error refreshing token:", error)
    return null
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response object
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken()

  if (!accessToken) {
    throw new Error("No access token available")
  }

  // Add authorization header
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  }

  // First attempt
  let response = await fetch(url, { ...options, headers })

  // If unauthorized, try to refresh token and retry
  if (response.status === 401) {
    const newToken = await refreshAccessToken()

    if (newToken) {
      // Retry with new token
      const refreshedHeaders = {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      }
      response = await fetch(url, { ...options, headers: refreshedHeaders })
    } else {
      // Refresh failed, logout user
      logout()
      throw new Error("Session expired. Please login again.")
    }
  }

  return response
}

/**
 * Decode JWT token to get expiration time
 * @param token - JWT token
 * @returns Expiration timestamp or null
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    const payload = JSON.parse(jsonPayload)
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Check if token is expired or will expire soon
 * @param token - JWT token
 * @param bufferMinutes - Minutes before expiration to consider token as expired (default: 5)
 * @returns True if token is expired or will expire soon
 */
export function isTokenExpired(token: string, bufferMinutes: number = 5): boolean {
  const expiration = getTokenExpiration(token)
  if (!expiration) return true

  const now = Date.now()
  const buffer = bufferMinutes * 60 * 1000
  return now >= expiration - buffer
}

/**
 * Check if access token needs refresh
 * @returns True if token should be refreshed
 */
export function shouldRefreshToken(): boolean {
  const accessToken = getAccessToken()
  if (!accessToken) return false
  return isTokenExpired(accessToken)
}
