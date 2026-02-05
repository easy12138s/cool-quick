import { useCallback, useRef, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

interface UseDrawerAutoHideProps {
  enabled?: boolean
  delay?: number
}

interface UseDrawerAutoHideReturn {
  isVisible: boolean
  handleMouseEnter: () => void
  handleMouseLeave: () => void
  hideDrawer: () => void
  resetTimer: () => void
}

export const useDrawerAutoHide = ({
  enabled = true,
  delay = 1500,
}: UseDrawerAutoHideProps = {}): UseDrawerAutoHideReturn => {
  const [isVisible, setIsVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInteractingRef = useRef(false)

  const hideDrawer = useCallback(() => {
    if (!enabled || isInteractingRef.current) return
    setIsVisible(false)
    invoke('window_hide_drawer').catch(() => {})
  }, [enabled])

  const resetTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    resetTimer()
    isInteractingRef.current = true
  }, [resetTimer])

  const handleMouseLeave = useCallback(() => {
    isInteractingRef.current = false
    if (enabled) {
      resetTimer()
      hideTimerRef.current = setTimeout(() => {
        hideDrawer()
      }, delay)
    }
  }, [enabled, delay, hideDrawer, resetTimer])

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideDrawer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hideDrawer])

  // 清理定时器
  useEffect(() => {
    return () => {
      resetTimer()
    }
  }, [resetTimer])

  return {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    hideDrawer,
    resetTimer,
  }
}
