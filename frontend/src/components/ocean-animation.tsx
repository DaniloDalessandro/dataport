"use client"

import { useEffect, useRef } from "react"

interface FloatingItem {
  x: number
  y: number
  text: string
  speed: number
  opacity: number
  size: number
  waveLayer: number
  baseY: number
}

export function OceanAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const itemsRef = useRef<FloatingItem[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = 300
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Define floating items
    const words = ["loa", "boca", "dwt", "duv", "plr", "pbm", "eta", "etb", "ets"]
    const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

    // Helper function to create sharp wave pattern (triangular/sawtooth)
    const createSharpWave = (x: number, offset: number, amplitude: number, frequency: number) => {
      const phase = (x * frequency + offset) % (Math.PI * 2)
      // Create triangular wave (sharp peaks)
      const triangular = (2 * amplitude / Math.PI) * Math.asin(Math.sin(phase))
      return triangular
    }

    // Initialize floating items
    const initItems = () => {
      const items: FloatingItem[] = []
      const numWaveLayers = 5 // Multiple wave layers for ocean depth

      // Create items distributed across wave layers
      for (let layer = 0; layer < numWaveLayers; layer++) {
        const baseY = 80 + (layer * 35) // Vertical offset for each wave layer
        const itemsPerLayer = 50

        for (let i = 0; i < itemsPerLayer; i++) {
          // Deeper layers (higher layer number) = more numbers, slower speed, darker/stronger blue
          // Surface layers (lower layer number) = more words, faster speed, lighter blue
          const numberProbability = 0.4 + (layer * 0.15) // Deeper = more numbers
          const isWord = Math.random() > numberProbability
          const text = isWord
            ? words[Math.floor(Math.random() * words.length)]
            : numbers[Math.floor(Math.random() * numbers.length)]

          items.push({
            x: Math.random() * canvas.width,
            y: baseY,
            baseY: baseY,
            text: text,
            // Much slower speeds - deeper layers move slower
            speed: 0.3 - (layer * 0.05) + Math.random() * 0.15,
            opacity: 0.4 + Math.random() * 0.4 - (layer * 0.05),
            size: 18 + Math.random() * 10 - (layer * 2),
            waveLayer: layer,
          })
        }
      }

      itemsRef.current = items
    }

    initItems()

    // Wave animation variables
    let waveOffset = 0

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw water background gradient
      const waterGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      waterGradient.addColorStop(0, "rgba(59, 130, 246, 0.08)")
      waterGradient.addColorStop(0.4, "rgba(37, 99, 235, 0.15)")
      waterGradient.addColorStop(0.7, "rgba(29, 78, 216, 0.22)")
      waterGradient.addColorStop(1, "rgba(30, 64, 175, 0.28)")
      ctx.fillStyle = waterGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw subtle animated water waves in background
      ctx.save()
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(0, canvas.height)
        for (let x = 0; x <= canvas.width; x += 5) {
          const y = Math.sin((x * 0.01 + waveOffset * (0.5 + i * 0.2)) * (1 + i * 0.3)) * (10 + i * 5)
                    + canvas.height - (40 + i * 30)
          ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width, canvas.height)
        ctx.closePath()
        ctx.fillStyle = `rgba(59, 130, 246, ${0.08 + i * 0.04})`
        ctx.fill()
      }
      ctx.restore()

      // Update and draw floating items forming sharp waves
      itemsRef.current.forEach((item) => {
        // Update horizontal position
        item.x += item.speed
        if (item.x > canvas.width + 120) {
          item.x = -120
        }

        // Create sharp wave motion (triangular waves with pointed peaks)
        // Each layer has different wave characteristics for more dramatic waves
        const layerFrequency = 0.003 + (item.waveLayer * 0.0008)
        const layerAmplitude = 65 - (item.waveLayer * 8) // Larger amplitude for more dramatic peaks

        // Main sharp wave - larger amplitude
        const sharpWave1 = createSharpWave(item.x, waveOffset * (1.3 - item.waveLayer * 0.1), layerAmplitude, layerFrequency)

        // Secondary sharp wave for complexity
        const sharpWave2 = createSharpWave(item.x, waveOffset * (0.9 + item.waveLayer * 0.05), layerAmplitude * 0.5, layerFrequency * 1.8)

        // Third wave for extra sharpness
        const sharpWave3 = createSharpWave(item.x, waveOffset * (1.5 - item.waveLayer * 0.08), layerAmplitude * 0.3, layerFrequency * 2.2)

        // Combine waves for complex ocean pattern with sharper peaks
        const waveY = sharpWave1 + sharpWave2 + sharpWave3

        // Calculate final Y position
        const finalY = item.baseY + waveY

        // Draw text forming the wave with enhanced visibility
        ctx.save()

        // Increase opacity for better visibility
        const enhancedOpacity = Math.min(item.opacity * 1.4, 0.9)
        ctx.globalAlpha = enhancedOpacity

        // Larger, bolder font
        ctx.font = `900 ${item.size}px "Geist Mono", monospace`

        // Enhanced color with more vibrance
        // Deeper layers (higher waveLayer) = stronger/darker blue
        // Surface layers (lower waveLayer) = lighter blue/cyan
        const hue = 210 - (item.waveLayer * 8) // Deeper = more blue, Surface = cyan
        const lightness = 70 - (item.waveLayer * 8) // Deeper = darker
        const saturation = 90 + (item.waveLayer * 2) // Deeper = more saturated/stronger

        // Add glow effect (multiple shadows for glow)
        // Deeper layers have stronger blue glow
        const glowIntensity = 0.6 + (item.waveLayer * 0.1)
        const glowBlue = 30 + (item.waveLayer * 20) // Deeper = more intense blue in glow
        ctx.shadowColor = `rgba(${glowBlue}, ${100 + item.waveLayer * 20}, 246, ${glowIntensity})`
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // First glow layer
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${enhancedOpacity})`
        ctx.fillText(item.text, item.x, finalY)

        // Second glow layer for more intensity
        ctx.shadowBlur = 8
        ctx.fillText(item.text, item.x, finalY)

        // Main text (solid, bright) - deeper layers are stronger blue
        ctx.shadowBlur = 0
        const mainLightness = lightness + (10 - item.waveLayer * 2)
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${mainLightness}%, 1)`
        ctx.fillText(item.text, item.x, finalY)

        ctx.restore()
      })

      // Increment wave offset for continuous animation (slower)
      waveOffset += 0.015

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
    <div className="fixed bottom-0 left-0 right-0 pointer-events-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "300px" }}
      />
    </div>
  )
}
