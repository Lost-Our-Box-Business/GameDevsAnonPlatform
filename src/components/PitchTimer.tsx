import { useEffect, useRef, useState } from 'react'

interface Props {
  seconds: number
  startedAt: string
  onExpire?: () => void
}

async function playBeep() {
  try {
    const ctx = new AudioContext()
    await ctx.resume() // unblock autoplay policy
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // AudioContext not available
  }
}

export function PitchTimer({ seconds, startedAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(seconds)
  const firedRef = useRef(false) // ref avoids stale-closure bug with useState

  useEffect(() => {
    firedRef.current = false

    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
      const left = Math.max(0, seconds - elapsed)
      setRemaining(left)
      if (left === 0 && !firedRef.current) {
        firedRef.current = true
        playBeep()
        onExpire?.()
      }
    }

    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [seconds, startedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(remaining / 60)
  const secs = Math.floor(remaining % 60)
  const display = `${mins}:${secs.toString().padStart(2, '0')}`
  const isLow = remaining <= 30 && remaining > 0
  const isDone = remaining === 0

  return (
    <div className={`text-4xl font-mono font-bold tabular-nums ${
      isDone ? 'text-zinc-500' : isLow ? 'text-red-400 animate-pulse' : 'text-white'
    }`}>
      {isDone ? '0:00' : display}
    </div>
  )
}
