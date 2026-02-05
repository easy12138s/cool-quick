import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clipboard } from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'

interface FloatingWindowProps {
  onMouseEnter: () => void
  noteCount?: number
}

const ORB_SIZE = 48

export const FloatingWindow: React.FC<FloatingWindowProps> = ({ onMouseEnter, noteCount = 0 }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevNoteCount = useRef(noteCount)

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
    }
  }, [])

  // 鼠标悬停 - 延迟显示抽屉
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current)
    drawerTimerRef.current = setTimeout(() => {
      onMouseEnter()
    }, 300)
  }, [onMouseEnter])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (drawerTimerRef.current) {
      clearTimeout(drawerTimerRef.current)
      drawerTimerRef.current = null
    }
  }, [])

  // 点击打开主窗口
  const handleClick = useCallback(async () => {
    await invoke('window_show_main')
  }, [])

  // 开始拖动
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    // 只有左键才触发拖动
    if (e.button === 0) {
      await invoke('window_start_dragging')
    }
  }, [])

  if (!isReady) return null

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        background: 'transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <motion.div
        className="relative"
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* 光晕效果 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isHovered
              ? '0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(99, 102, 241, 0.3)'
              : showPulse
                ? '0 0 20px rgba(99, 102, 241, 0.5)'
                : '0 4px 15px rgba(99, 102, 241, 0.4)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* 球体主体 */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
          }}
        >
          {/* 内发光 */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6) 0%, transparent 50%)',
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
            <Clipboard size={20} strokeWidth={1.5} />
          </div>
        </div>

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
