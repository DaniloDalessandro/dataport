"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  profile_type: string
  must_change_password: boolean
  is_staff: boolean
  is_superuser: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token")
      const userData = localStorage.getItem("user_data")

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          setIsAuthenticated(true)
        } catch (error) {
          console.error("Error parsing user data:", error)
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          localStorage.removeItem("user_data")
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Login failed")
    }

    const data = await response.json()

    // Store tokens
    localStorage.setItem("access_token", data.token)
    if (data.refresh) {
      localStorage.setItem("refresh_token", data.refresh)
    }

    // Store user data
    if (data.user) {
      localStorage.setItem("user_data", JSON.stringify(data.user))
      setUser(data.user)
    }

    setIsAuthenticated(true)
  }

  const logout = () => {
    const refreshToken = localStorage.getItem("refresh_token")

    // Call logout endpoint if refresh token exists
    if (refreshToken) {
      fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      }).catch(error => console.error("Logout error:", error))
    }

    // Clear local storage
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_data")

    // Clear state
    setUser(null)
    setIsAuthenticated(false)
  }

  const refreshToken = async (): Promise<boolean> => {
    const refresh = localStorage.getItem("refresh_token")

    if (!refresh) {
      return false
    }

    try {
      const response = await fetch("http://localhost:8000/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      localStorage.setItem("access_token", data.token)

      return true
    } catch (error) {
      console.error("Token refresh error:", error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export { AuthContext }
