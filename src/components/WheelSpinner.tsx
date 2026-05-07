import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  items: string[]
  onSelect: (item: string) => void
  onClose: () => void
}

const COLORS = [
  '#7c3aed', '#db2777', '#059669', '#d97706', '#2563eb',
  '#dc2626', '#0891b2', '#65a30d', '#9333ea', '#ea580c',
]

export function WheelSpinner({ items, onSelect, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const angleRef = useRef(0)
  const animRef = useRef<number>(0)

  const sliceAngle = (2 * Math.PI) / items.length

  function drawWheel(angle: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = cx - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    items.forEach((item, i) => {
      const start = angle + i * sliceAngle
      const end = start + sliceAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#18181b'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px system-ui, sans-serif'
      const label = item.length > 18 ? item.slice(0, 17) + '…' : item
      ctx.fillText(label, r - 12, 5)
      ctx.restore()
    })

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = '#09090b'
    ctx.fill()
    ctx.strokeStyle = '#52525b'
    ctx.lineWidth = 2
    ctx.stroke()

    // Pointer at right (0 angle = right, winning slice is at angle 0)
    ctx.beginPath()
    ctx.moveTo(canvas.width - 2, cy)
    ctx.lineTo(canvas.width - 22, cy - 12)
    ctx.lineTo(canvas.width - 22, cy + 12)
    ctx.closePath()
    ctx.fillStyle = '#facc15'
    ctx.fill()
  }

  useEffect(() => {
    drawWheel(angleRef.current)
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  function spin() {
    if (spinning) return
    setResult(null)
    setSpinning(true)

    const extraSpins = (5 + Math.random() * 5) * 2 * Math.PI
    const randomStop = Math.random() * 2 * Math.PI
    const targetAngle = angleRef.current + extraSpins + randomStop
    const duration = 3500 + Math.random() * 1500
    const startAngle = angleRef.current
    const startTime = performance.now()

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3)
    }

    function frame(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      angleRef.current = startAngle + (targetAngle - startAngle) * easeOut(t)
      drawWheel(angleRef.current)
      if (t < 1) {
        animRef.current = requestAnimationFrame(frame)
      } else {
        setSpinning(false)
        // Determine winner: pointer at angle=0 on right side
        // The slice at the pointer is determined by -(angle mod 2π)
        const normalized = ((-angleRef.current) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
        const idx = Math.floor(normalized / sliceAngle) % items.length
        setResult(items[idx])
      }
    }
    animRef.current = requestAnimationFrame(frame)
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Randomizer</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} width={340} height={340} className="rounded-full" />
        </div>

        {result && (
          <div className="text-center mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <p className="text-zinc-400 text-sm mb-1">Selected</p>
            <p className="text-white font-bold text-lg">{result}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={spin}
            disabled={spinning}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {spinning ? 'Spinning…' : result ? 'Re-spin' : 'Spin'}
          </button>
          {result && (
            <button
              onClick={() => onSelect(result)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              Select This
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
