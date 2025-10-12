import { ModernLoginForm } from "@/components/modern-login-form"
import { OceanAnimation } from "@/components/ocean-animation"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Animation */}
      <OceanAnimation />

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md">
        <ModernLoginForm />
      </div>
    </div>
  )
}
