"use client"

import { useEffect, useRef } from "react"

interface DataParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  type: 'binary' | 'dot' | 'hex'
  value: string
  trail: { x: number; y: number; opacity: number }[]
}

export function DataFlowAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<DataParticle[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Binary and hex values for data theme
    const binaryValues = ['0', '1']
    const hexValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']

    // Initialize particles
    const initParticles = () => {
      const particles: DataParticle[] = []
      const numParticles = 30 // Reduzido de 80 para 30

      for (let i = 0; i < numParticles; i++) {
        const type = Math.random() < 0.3 ? 'binary' : Math.random() < 0.8 ? 'dot' : 'hex'
        let value = ''

        if (type === 'binary') {
          value = binaryValues[Math.floor(Math.random() * binaryValues.length)]
        } else if (type === 'hex') {
          value = hexValues[Math.floor(Math.random() * hexValues.length)]
        }

        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5, // Movimento mais lento (era 1.5)
          vy: (Math.random() - 0.5) * 0.5, // Movimento mais lento (era 1.5)
          size: type === 'dot' ? 1.5 + Math.random() * 2 : 10 + Math.random() * 4, // Menor
          opacity: 0.1 + Math.random() * 0.15, // Muito mais transparente (era 0.3-0.7)
          type,
          value,
          trail: []
        })
      }

      particlesRef.current = particles
    }

    initParticles()

    // Animation loop
    const animate = () => {
      // Semi-transparent clear for trail effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw connection lines between nearby particles (mais sutil)
      ctx.save()
      particlesRef.current.forEach((particle, i) => {
        particlesRef.current.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) { // Distância menor (era 150)
            const opacity = (1 - distance / 120) * 0.04 // Muito mais transparente (era 0.15)
            ctx.beginPath()
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`
            ctx.lineWidth = 0.5 // Linha mais fina (era 1)
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.stroke()
          }
        })
      })
      ctx.restore()

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around screen
        if (particle.x < -50) particle.x = canvas.width + 50
        if (particle.x > canvas.width + 50) particle.x = -50
        if (particle.y < -50) particle.y = canvas.height + 50
        if (particle.y > canvas.height + 50) particle.y = -50

        // Add trail point (trail menor)
        if (particle.type === 'dot') {
          particle.trail.push({
            x: particle.x,
            y: particle.y,
            opacity: particle.opacity
          })
          if (particle.trail.length > 5) { // Trail mais curto (era 10)
            particle.trail.shift()
          }
        }

        ctx.save()

        // Draw trail for dots
        if (particle.type === 'dot' && particle.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y)

          for (let i = 1; i < particle.trail.length; i++) {
            ctx.lineTo(particle.trail[i].x, particle.trail[i].y)
          }

          const gradient = ctx.createLinearGradient(
            particle.trail[0].x,
            particle.trail[0].y,
            particle.x,
            particle.y
          )
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0)')
          gradient.addColorStop(1, `rgba(59, 130, 246, ${particle.opacity * 0.2})`) // Mais transparente

          ctx.strokeStyle = gradient
          ctx.lineWidth = 1 // Linha mais fina (era 2)
          ctx.stroke()
        }

        // Draw particle
        if (particle.type === 'dot') {
          // Draw glowing dot (sem brilho excessivo)
          ctx.globalAlpha = particle.opacity
          ctx.fillStyle = '#3b82f6'
          ctx.shadowColor = '#3b82f6'
          ctx.shadowBlur = 4 // Brilho reduzido (era 10)
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()

          // Inner bright core (mais sutil)
          ctx.shadowBlur = 0
          ctx.fillStyle = '#93c5fd'
          ctx.globalAlpha = particle.opacity * 0.5
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 0.4, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Draw text (binary or hex) - mais sutil
          ctx.globalAlpha = particle.opacity
          ctx.font = `500 ${particle.size}px "Geist Mono", monospace` // Peso reduzido (era 600)
          ctx.fillStyle = '#3b82f6'
          ctx.shadowColor = '#3b82f6'
          ctx.shadowBlur = 3 // Brilho reduzido (era 8)
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(particle.value, particle.x, particle.y)
        }

        ctx.restore()
      })

      // Draw flowing data streams in background (muito sutil)
      ctx.save()
      const time = Date.now() * 0.001
      for (let i = 0; i < 2; i++) { // Menos ondas (era 3)
        const y = 150 + i * 300
        const offset = time * (20 + i * 15) // Movimento mais lento

        ctx.beginPath()
        for (let x = -50; x < canvas.width + 50; x += 3) { // Menos pontos
          const wave = Math.sin((x + offset) * 0.01) * 3
          ctx.lineTo(x, y + wave)
        }
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.02 - i * 0.005})` // Muito mais transparente
        ctx.lineWidth = 1 // Linha mais fina
        ctx.stroke()
      }
      ctx.restore()

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-gradient-to-br from-blue-50/10 via-white to-blue-50/5">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  )
}
