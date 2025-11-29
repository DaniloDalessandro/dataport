export interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    const message = description ? `${title}\n${description}` : title

    if (variant === "destructive") {
      alert(`❌ ${message}`)
    } else {
      alert(`✅ ${message}`)
    }
  }

  return { toast }
}
