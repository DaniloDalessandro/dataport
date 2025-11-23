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
    const numbers = ["0", "1"]

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
      const numWaveLayers = 3 // Reduced from 5

      // Create items distributed across wave layers
      for (let layer = 0; layer < numWaveLayers; layer++) {
        const baseY = 120 + (layer * 45) // Adjusted baseY
        const itemsPerLayer = 30 // Reduced from 50

        for (let i = 0; i < itemsPerLayer; i++) {
          const numberProbability = 0.5 + (layer * 0.1)
          const isWord = Math.random() > numberProbability
          const text = isWord
            ? words[Math.floor(Math.random() * words.length)]
            : numbers[Math.floor(Math.random() * numbers.length)]

          items.push({
            x: Math.random() * canvas.width,
            y: baseY,
            baseY: baseY,
            text: text,
            speed: 0.1 - (layer * 0.02) + Math.random() * 0.05, // Slower speed
            opacity: 0.2 + Math.random() * 0.3 - (layer * 0.05), // Lower opacity
            size: 14 + Math.random() * 8 - (layer * 2), // Smaller size
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

      // Draw water background gradient (lighter blues)
      const waterGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      waterGradient.addColorStop(0, "rgba(173, 216, 230, 0.02)") // Light blue, very transparent
      waterGradient.addColorStop(0.5, "rgba(135, 206, 250, 0.05)") // Lighter sky blue
      waterGradient.addColorStop(1, "rgba(100, 149, 237, 0.08)") // Cornflower blue
      ctx.fillStyle = waterGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw subtle animated water waves in background
      ctx.save()
      for (let i = 0; i < 2; i++) { // Reduced from 3
        ctx.beginPath()
        ctx.moveTo(0, canvas.height)
        for (let x = 0; x <= canvas.width; x += 10) {
          const y = Math.sin((x * 0.005 + waveOffset * (0.4 + i * 0.2)) * (1 + i * 0.3)) * (8 + i * 4)
                    + canvas.height - (60 + i * 40)
          ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width, canvas.height)
        ctx.closePath()
        ctx.fillStyle = `rgba(173, 216, 230, ${0.05 + i * 0.03})` // Lighter blue
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

        const layerFrequency = 0.002 + (item.waveLayer * 0.0005)
        const layerAmplitude = 40 - (item.waveLayer * 6)

        const sharpWave1 = createSharpWave(item.x, waveOffset * (1.1 - item.waveLayer * 0.1), layerAmplitude, layerFrequency)
        const sharpWave2 = createSharpWave(item.x, waveOffset * (0.8 + item.waveLayer * 0.05), layerAmplitude * 0.4, layerFrequency * 1.5)
        const waveY = sharpWave1 + sharpWave2
        const finalY = item.baseY + waveY

        ctx.save()

        const enhancedOpacity = Math.min(item.opacity * 1.2, 0.7)
        ctx.globalAlpha = enhancedOpacity

        ctx.font = `700 ${item.size}px "Geist Mono", monospace`

        // Shades of white and light blue
        const hue = 200 - (item.waveLayer * 10)
        const lightness = 85 - (item.waveLayer * 5)
        const saturation = 40 + (item.waveLayer * 10)

        // Lighter glow effect
        const glowIntensity = 0.3 + (item.waveLayer * 0.05)
        ctx.shadowColor = `rgba(173, 216, 230, ${glowIntensity})` // Light blue glow
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // Text fill
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${enhancedOpacity})`
        ctx.fillText(item.text, item.x, finalY)

        ctx.restore()
      })

      // Slower wave offset
      waveOffset += 0.01

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
