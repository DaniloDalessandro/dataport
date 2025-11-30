"use client"

import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getApiUrl } from "@/lib/config"

interface ModernLoginFormProps {
  className?: string
}

export function ModernLoginForm({ className }: ModernLoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState("")

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}

    // Email validation
    if (!email) {
      newErrors.email = "Email é obrigatório"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Por favor, insira um email válido"
    }

    // Password validation
    if (!password) {
      newErrors.password = "Senha é obrigatória"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoginError("")

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle different error scenarios
        if (response.status === 401) {
          setLoginError("Email ou senha incorretos. Por favor, tente novamente.")
        } else if (response.status === 403) {
          setLoginError(data.error || "Acesso negado. Conta pode estar inativa.")
        } else if (response.status >= 500) {
          setLoginError("Erro no servidor. Tente novamente mais tarde.")
        } else {
          setLoginError(data.error || data.message || "Falha no login. Verifique suas credenciais.")
        }
        setIsLoading(false)
        return
      }

      // Store authentication tokens
      if (data.access || data.token) {
        const accessToken = data.access || data.token
        localStorage.setItem("access_token", accessToken)
      }

      if (data.refresh) {
        localStorage.setItem("refresh_token", data.refresh)
      }

      // Store user data if available
      if (data.user) {
        localStorage.setItem("user_data", JSON.stringify(data.user))
      }

      // Redirect to dashboard (private route)
      window.location.href = "/dashboard"
    } catch (error) {
      console.error("Login error:", error)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setLoginError("Não foi possível conectar ao servidor. Verifique sua conexão.")
      } else {
        setLoginError("Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.")
      }
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="bg-card border rounded-xl shadow-2xl p-8 backdrop-blur-sm bg-white/95 dark:bg-card/95">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            DataDock
          </h1>
          <p className="text-muted-foreground text-sm">
            Entre na sua conta para continuar
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }))
                }
              }}
              className={cn(
                "h-11 transition-all duration-200",
                errors.email && "border-destructive focus-visible:ring-destructive/20"
              )}
              disabled={isLoading}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive animate-in fade-in-50 duration-200">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <a
                href="#"
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Esqueceu a senha?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }))
                }
              }}
              className={cn(
                "h-11 transition-all duration-200",
                errors.password && "border-destructive focus-visible:ring-destructive/20"
              )}
              disabled={isLoading}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-sm text-destructive animate-in fade-in-50 duration-200">
                {errors.password}
              </p>
            )}
          </div>

          {/* Login Error */}
          {loginError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 animate-in fade-in-50 duration-200">
              <p className="text-sm text-destructive text-center">{loginError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Ou continuar com
            </span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 hover:bg-accent transition-all duration-200"
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 hover:bg-accent transition-all duration-200"
            disabled={isLoading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23" fill="none">
              <path d="M0 0h10.931v10.931H0z" fill="#f25022"/>
              <path d="M12.069 0H23v10.931H12.069z" fill="#7fba00"/>
              <path d="M0 12.069h10.931V23H0z" fill="#00a4ef"/>
              <path d="M12.069 12.069H23V23H12.069z" fill="#ffb900"/>
            </svg>
            Microsoft
          </Button>
        </div>
      </div>

      {/* Terms */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ao entrar, você concorda com nossos{" "}
        <a href="#" className="underline hover:text-foreground transition-colors">
          Termos de Serviço
        </a>{" "}
        e{" "}
        <a href="#" className="underline hover:text-foreground transition-colors">
          Política de Privacidade
        </a>
      </p>
    </div>
  )
}
