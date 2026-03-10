"use client"
import { useState, useCallback } from "react"

type ToastVariant = "default" | "destructive" | "success"

interface ToastOptions {
  title: string
  description: string
  variant?: ToastVariant
  duration?: number
}

interface Toast extends ToastOptions {
  id: string
}

// Este es un hook simplificado para el ejemplo
// En una implementación real, usarías un contexto global
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ title, description, variant = "default", duration = 3000 }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, variant, duration }

    // En una implementación real, esto añadiría el toast a un estado global
    // y se mostraría en un componente de toast
    console.log("Toast:", newToast)

    // Simular la eliminación del toast después de la duración
    setTimeout(() => {
      // En una implementación real, esto eliminaría el toast del estado global
      console.log("Toast removed:", id)
    }, duration)

    return id
  }, [])

  return { toast }
}
