"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  isAuthenticated,
  getUserData,
  logout,
  shouldRefreshToken,
  refreshAccessToken,
  type UserData,
} from "@/lib/auth"

interface UseAuthReturn {
  isAuthenticated: boolean
  isLoading: boolean
  user: UserData | null
  logout: () => void
  refreshToken: () => Promise<boolean>
}

/**
 * Custom hook for managing authentication state
 * Provides user data, authentication status, and auth-related functions
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)

      if (authenticated) {
        const userData = getUserData()
        setUser(userData)
      } else {
        setUser(null)
      }

      setIsAuthChecking(false)
    }

    checkAuth()

    // Re-check on storage change (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "access_token" ||
        e.key === "refresh_token" ||
        e.key === "user_data"
      ) {
        checkAuth()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const handleLogout = () => {
    logout()
    setIsAuth(false)
    setUser(null)
  }

  const handleRefreshToken = async (): Promise<boolean> => {
    if (!shouldRefreshToken()) {
      return true
    }

    const newToken = await refreshAccessToken()
    if (!newToken) {
      handleLogout()
      return false
    }

    return true
  }

  return {
    isAuthenticated: isAuth,
    isLoading: isAuthChecking,
    user,
    logout: handleLogout,
    refreshToken: handleRefreshToken,
  }
}

/**
 * Hook that redirects to login if user is not authenticated
 * Use this in pages that require authentication
 */
export function useRequireAuth(): UseAuthReturn {
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push("/login")
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  return auth
}

/**
 * Hook that redirects to dashboard if user is already authenticated
 * Use this in login/signup pages
 */
export function useRedirectIfAuthenticated(redirectTo: string = "/dashboard") {
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      router.push(redirectTo)
    }
  }, [auth.isLoading, auth.isAuthenticated, router, redirectTo])

  return auth
}
