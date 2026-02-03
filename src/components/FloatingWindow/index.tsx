import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clipboard, Sparkles, Pin, Settings, GripHorizontal } from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { AppConfig } from '../../stores/useConfigStore'

interface FloatingWindowProps {
  onMouseEnter: () => void
  config: AppConfig | null
  noteCount?: number
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  onMouseEnter,
  config,
  noteCount = 0
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [customIcon, setCustomIcon] = useState<string | null>(null)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const dragRef = useRef<HTMLDivElement>(null)

  const size = config?.floating_window_size || 56
  const opacity = config?.floating_window_opacity || 0.95

  useEffect(() => {
    const savedIcon = localStorage.getItem('customIcon')
    const savedPinned = localStorage.getItem('floatingWindowPinned')
    if (savedIcon) setCustomIcon(savedIcon)
    if (savedPinned) setIsPinned(JSON.parse(savedPinned))

    // Load saved position
    invoke('config_get').then((cfg: any) => {
      if (cfg?.floating_position) {
        setPosition(cfg.floating_position)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (noteCount > 0) {
      setShowPulse(true)
      const timer = setTimeout(() => setShowPulse(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [noteCount])

  const handleDragStart = async (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    
    try {
      await invoke('window_start_drag')
    } catch (e) {
      // Fallback to manual drag
    }
  }

  const handleDragEnd = async () => {
    setIsDragging(false)
    // Save position
    await invoke('config_update', {
      newConfig: {
        ...config,
        floating_position: position
      }
    }).catch(() => {})
  }

  const handleMouseEnter = () => {
    if (!isDragging) {
      setIsHovered(true)
      onMouseEnter()
    }
  }

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newPinned = !isPinned
    setIsPinned(newPinned)
    localStorage.setItem('floatingWindowPinned', JSON.stringify(newPinned))
  }

  const openSettings = (e: React.MouseEvent) => {
    e.stopPropagation()
    invoke('window_show_settings')
  }

  return (
    <motion.div
      ref={dragRef}
      className="fixed rounded-full cursor-pointer flex items-center justify-center"
      style={{
        width: size,
        height: size,
        left: position.x,
        top: position.y,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isHovered ? 1 : opacity,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onMouseDown={handleDragStart}
      onMouseUp={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: isHovered
            ? '0 0 30px rgba(79, 70, 229, 0.6), 0 0 60px rgba(124, 58, 237, 0.4)'
            : showPulse
              ? '0 0 20px rgba(79, 70, 229, 0.4)'
              : '0 4px 20px rgba(79, 70, 229, 0.3)'
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #4f46e5 100%)',
          backgroundSize: '200% 200%',
        }}
        animate={{
          backgroundPosition: isHovered ? ['0% 0%', '100% 100%'] : '0% 0%',
        }}
        transition={{
          duration: 2,
          repeat: isHovered ? Infinity : 0,
          repeatType: 'reverse',
        }}
      />

      {/* Pulse ring animation */}
      <AnimatePresence>
        {showPulse && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: 1 }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <motion.div
        className="relative z-10 text-white"
        animate={{
          rotate: isHovered ? [0, -10, 10, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        {customIcon ? (
          <img
            src={customIcon}
            alt="icon"
            className="w-full h-full object-contain"
            style={{ width: size * 0.5, height: size * 0.5 }}
          />
        ) : (
          <Clipboard size={size * 0.5} strokeWidth={2.5} />
        )}
      </motion.div>

      {/* Notification badge */}
      <AnimatePresence mode="wait">
        {noteCount > 0 && (
          <motion.div
            key={noteCount}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold px-1.5 shadow-lg"
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -10 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 25
            }}
          >
            {noteCount > 99 ? '99+' : noteCount}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <GripHorizontal size={14} className="text-white/50" />
        </div>
      )}

      {/* Expanded controls on hover */}
      <AnimatePresence>
        {isHovered && (
          <>
            <motion.button
              className="absolute -left-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300"
              initial={{ scale: 0, x: 10 }}
              animate={{ scale: 1, x: 0 }}
              exit={{ scale: 0, x: 10 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePin}
              title={isPinned ? '取消固定' : '固定位置'}
            >
              <Pin size={14} className={isPinned ? 'fill-current text-primary-600' : ''} />
            </motion.button>

            <motion.button
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300"
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 10 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={openSettings}
              title="设置"
            >
              <Settings size={14} />
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute -top-16 left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg whitespace-nowrap shadow-xl"
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles size={12} className="text-yellow-400" />
              {noteCount} 条笔记 · 点击展开
            </span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-white rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
