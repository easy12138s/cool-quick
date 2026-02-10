import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { invoke } from '@tauri-apps/api/tauri'
import coolQuickIcon from '../../assets/coolquick-icon.svg'

interface FloatingWindowProps {
  onMouseEnter: () => void
  noteCount?: number
}

const ORB_SIZE = 48
const DRAG_THRESHOLD_PX = 3
const DRAG_HOLD_MS = 120
const CLICK_MAX_MS = 250

export const FloatingWindow: React.FC<FloatingWindowProps> = ({ onMouseEnter, noteCount = 0 }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevNoteCount = useRef(noteCount)

  const dragHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerDownRef = useRef(false)
  const dragStartedRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const pointerDownTimeRef = useRef(0)
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // 初始化
  useEffect(() => {
    setIsReady(true)
  }, [])

  // 脉冲动画 - 只在数量增加时触发
  useEffect(() => {
    if (noteCount > prevNoteCount.current && noteCount > 0) {
      setShowPulse(true)
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
      pulseTimerRef.current = setTimeout(() => setShowPulse(false), 2000)
    }
    prevNoteCount.current = noteCount
  }, [noteCount])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current)
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
      if (dragHoldTimerRef.current) clearTimeout(dragHoldTimerRef.current)
    }
  }, [])

  const clearHoverTimer = useCallback(() => {
    if (drawerTimerRef.current) {
      clearTimeout(drawerTimerRef.current)
      drawerTimerRef.current = null
    }
  }, [])

  const clearDragHoldTimer = useCallback(() => {
    if (dragHoldTimerRef.current) {
      clearTimeout(dragHoldTimerRef.current)
      dragHoldTimerRef.current = null
    }
  }, [])

  const startDragging = useCallback(async () => {
    if (dragStartedRef.current) return
    dragStartedRef.current = true
    setIsDragging(true)
    clearHoverTimer()
    setIsHovered(false)
    pointerDownRef.current = false
    pointerIdRef.current = null
    clearDragHoldTimer()

    try {
      await invoke('window_hide_drawer')
      await invoke('window_start_dragging')
    } catch {
      // ignore
    }
  }, [clearDragHoldTimer, clearHoverTimer])

  const handlePointerEnter = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      pointerDownRef.current = false
      dragStartedRef.current = false
      pointerIdRef.current = null
      clearDragHoldTimer()
    }

    if (pointerDownRef.current) return
    setIsHovered(true)
    clearHoverTimer()
    drawerTimerRef.current = setTimeout(() => {
      if (!pointerDownRef.current && !isDragging) {
        onMouseEnter()
      }
    }, 300)
  }, [clearDragHoldTimer, clearHoverTimer, isDragging, onMouseEnter])

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false)
    clearHoverTimer()
  }, [clearHoverTimer])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return

      pointerDownRef.current = true
      dragStartedRef.current = false
      pointerIdRef.current = e.pointerId
      pointerDownTimeRef.current = Date.now()
      pointerStartRef.current = { x: e.clientX, y: e.clientY }
      clearHoverTimer()
      clearDragHoldTimer()

      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }

      dragHoldTimerRef.current = setTimeout(() => {
        if (pointerDownRef.current && !dragStartedRef.current) {
          startDragging()
        }
      }, DRAG_HOLD_MS)
    },
    [clearDragHoldTimer, clearHoverTimer, startDragging]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDownRef.current || dragStartedRef.current) return
      const dx = e.clientX - pointerStartRef.current.x
      const dy = e.clientY - pointerStartRef.current.y
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        clearDragHoldTimer()
        startDragging()
      }
    },
    [clearDragHoldTimer, startDragging]
  )

  const endPointerInteraction = useCallback(async () => {
    if (!pointerDownRef.current) return

    const duration = Date.now() - pointerDownTimeRef.current
    const shouldClick = !dragStartedRef.current && duration <= CLICK_MAX_MS

    pointerDownRef.current = false
    dragStartedRef.current = false
    pointerIdRef.current = null
    clearDragHoldTimer()
    setIsDragging(false)

    if (shouldClick) {
      await invoke('window_show_main')
    }
  }, [clearDragHoldTimer])

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(pointerIdRef.current)
        } catch {
          // ignore
        }
      }
      await endPointerInteraction()
    },
    [endPointerInteraction]
  )

  const handlePointerCancel = useCallback(async () => {
    await endPointerInteraction()
  }, [endPointerInteraction])

  if (!isReady) return null

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        background: 'transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <motion.div
        className="relative"
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
        animate={{ scale: isHovered && !isDragging ? 1.08 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* 光晕效果 - 悬停时不显示阴影 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: showPulse
              ? '0 0 20px rgba(99, 102, 241, 0.5)'
              : isHovered && !isDragging
                ? '0 10px 26px rgba(99, 102, 241, 0.42)'
                : '0 6px 18px rgba(99, 102, 241, 0.35)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* 球体主体 */}
        <motion.div
          className="relative w-full h-full rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
            backgroundSize: '180% 180%',
          }}
          animate={{
            backgroundPosition: isHovered && !isDragging ? ['0% 0%', '100% 100%'] : '0% 0%',
          }}
          transition={{
            duration: 1.8,
            repeat: isHovered && !isDragging ? Infinity : 0,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        >
          <div className="absolute inset-0 rounded-full border border-white/25" />

          {/* 内发光 */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6) 0%, transparent 50%)',
            }}
          />

          <div
            className="absolute inset-0 opacity-35"
            style={{
              background:
                'radial-gradient(circle at 70% 80%, rgba(0,0,0,0.25) 0%, transparent 55%)',
            }}
          />

          {/* 脉冲环 */}
          <AnimatePresence>
            {showPulse && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/60"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* 图标 */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <img src={coolQuickIcon} alt="CoolQuick" className="w-5 h-5" draggable={false} />
          </div>
        </motion.div>

        {/* 徽章 - 显示笔记数量 */}
        <AnimatePresence mode="wait">
          {noteCount > 0 && (
            <motion.div
              key={noteCount}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 shadow-lg border-2 border-white"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {noteCount > 99 ? '99+' : noteCount}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
