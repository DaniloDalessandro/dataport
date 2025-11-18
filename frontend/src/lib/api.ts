import { config } from "./config"
import {
  getAccessToken,
  refreshAccessToken,
  logout,
  isTokenExpired,
} from "./auth"

const API_BASE_URL = config.apiUrl

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken()

  console.log("[API] Token from localStorage:", token ? `${token.substring(0, 20)}...` : "null")

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  } else {
    console.warn("[API] No access token found in localStorage!")
  }

  return headers
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`

  // Check if token needs refresh before making request
  const token = getAccessToken()
  if (token && isTokenExpired(token, 1)) {
    console.log("[API] Token is expired or expiring soon, refreshing...")
    const newToken = await refreshAccessToken()
    if (!newToken) {
      console.error("[API] Failed to refresh token, logging out")
      logout()
      throw new Error("Session expired. Please login again.")
    }
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: "include",
  }

  let response = await fetch(url, config)

  // If we get 401, try to refresh token and retry once
  if (response.status === 401) {
    console.log("[API] Received 401, attempting token refresh...")
    const newToken = await refreshAccessToken()

    if (newToken) {
      console.log("[API] Token refreshed successfully, retrying request...")
      // Retry request with new token
      const retryConfig: RequestInit = {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers,
        },
        credentials: "include",
      }
      response = await fetch(url, retryConfig)
    } else {
      console.error("[API] Token refresh failed, logging out")
      logout()
      throw new Error("Session expired. Please login again.")
    }
  }

  return response
}

export async function apiGet(endpoint: string): Promise<any> {
  const response = await apiRequest(endpoint, { method: "GET" })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.detail || "Request failed")
  }

  return response.json()
}

export async function apiPost(endpoint: string, data: any): Promise<any> {
  const response = await apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.detail || "Request failed")
  }

  return response.json()
}

export async function apiDelete(endpoint: string): Promise<any> {
  const response = await apiRequest(endpoint, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.detail || "Request failed")
  }

  return response.json()
}
