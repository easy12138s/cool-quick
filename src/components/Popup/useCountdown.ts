import { useState, useEffect, useCallback, useRef } from 'react'

interface UseCountdownOptions {
  initialSeconds: number
  onComplete?: () => void
  autoStart?: boolean
}

interface UseCountdownReturn {
  seconds: number
  progress: number // 0-100
  isPaused: boolean
  pause: () => void
  resume: () => void
  reset: (newSeconds?: number) => void
  restart: () => void
}

export const useCountdown = ({
  initialSeconds,
  onComplete,
  autoStart = true,
}: UseCountdownOptions): UseCountdownReturn => {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isPaused, setIsPaused] = useState(!autoStart)
  const startTimeRef = useRef<number | null>(null)
  const pausedTimeRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)
  const initialSecondsRef = useRef(initialSeconds)

  const progress = Math.max(0, (seconds / initialSecondsRef.current) * 100)

  const tick = useCallback(() => {
    if (isPaused) return

    const now = Date.now()
    if (startTimeRef.current === null) {
      startTimeRef.current = now - pausedTimeRef.current
    }

    const elapsed = (now - startTimeRef.current) / 1000
    const remaining = Math.max(0, initialSecondsRef.current - elapsed)

    setSeconds(remaining)

    if (remaining <= 0) {
      onComplete?.()
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [isPaused, onComplete])

  useEffect(() => {
    if (!isPaused) {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isPaused, tick])

  const pause = useCallback(() => {
    if (!isPaused && startTimeRef.current !== null) {
      pausedTimeRef.current = Date.now() - startTimeRef.current
      setIsPaused(true)
    }
  }, [isPaused])

  const resume = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
    }
  }, [isPaused])

  const reset = useCallback(
    (newSeconds?: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      const targetSeconds = newSeconds ?? initialSecondsRef.current
      initialSecondsRef.current = targetSeconds
      setSeconds(targetSeconds)
      startTimeRef.current = null
      pausedTimeRef.current = 0
      setIsPaused(!autoStart)
    },
    [autoStart]
  )

  const restart = useCallback(() => {
    reset(initialSecondsRef.current)
  }, [reset])

  return {
    seconds,
    progress,
    isPaused,
    pause,
    resume,
    reset,
    restart,
  }
}
