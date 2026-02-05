import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clipboard, Sparkles, Pin, Settings, GripVertical } from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { currentMonitor } from '@tauri-apps/api/window'

interface FloatingWindowProps {
  onMouseEnter: () => void
  noteCount?: number
}

const ORB_SIZE = 56
const SNAP_THRESHOLD = 20
const EDGE_MARGIN = 8
const DRAWER_DELAY = 400

export const FloatingWindow: React.FC<FloatingWindowProps> = ({ onMouseEnter, noteCount = 0 }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isPinned, setIsPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('floatingWindowPinned')
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })
  const [showPulse, setShowPulse] = useState(false)
  const [isNearEdge, setIsNearEdge] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isReady, setIsReady] = useState(false)

  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevNoteCount = useRef(noteCount)

  // 初始化位置
  useEffect(() => {
    const init = async () => {
      try {
        const cfg = (await invoke('config_get')) as any
        const monitor = await currentMonitor()

        if (monitor) {
          const { width, height } = monitor.size
          const defaultPos = {
            x: width - ORB_SIZE - 30,
            y: height / 2 - ORB_SIZE / 2,
          }
          const targetPos = cfg?.floating_position || defaultPos

          // 确保在屏幕内
          const clampedPos = {
            x: Math.max(0, Math.min(targetPos.x, width - ORB_SIZE)),
            y: Math.max(0, Math.min(targetPos.y, height - ORB_SIZE)),
          }

          setPosition(clampedPos)
          await invoke('window_set_position', clampedPos)
          setIsReady(true)
        }
      } catch (e) {
        console.error('Init failed:', e)
      }
    }
    init()
  }, [])

  // 保存固定状态
  useEffect(() => {
    localStorage.setItem('floatingWindowPinned', JSON.stringify(isPinned))
  }, [isPinned])

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

  // 边缘磁吸检测
  const checkEdgeSnap = useCallback(async (x: number, y: number) => {
    const monitor = await currentMonitor()
    if (!monitor) return { x, y, snapped: false }

    const { width, height } = monitor.size
    let newX = x
    let newY = y
    let snapped = false

    if (x < SNAP_THRESHOLD) {
      newX = EDGE_MARGIN
      snapped = true
    } else if (x > width - ORB_SIZE - SNAP_THRESHOLD) {
      newX = width - ORB_SIZE - EDGE_MARGIN
      snapped = true
    }

    if (y < SNAP_THRESHOLD) {
      newY = EDGE_MARGIN
      snapped = true
    } else if (y > height - ORB_SIZE - SNAP_THRESHOLD) {
      newY = height - ORB_SIZE - EDGE_MARGIN
      snapped = true
    }

    return { x: newX, y: newY, snapped }
  }, [])

  // 保存位置
  const savePosition = useCallback(
    async (x: number, y: number) => {
      const result = await checkEdgeSnap(x, y)
      setPosition({ x: result.x, y: result.y })
      setIsNearEdge(result.snapped)
      await invoke('window_set_position', { x: result.x, y: result.y })
      await invoke('config_update', {
        updates: { floating_position: { x: result.x, y: result.y } },
      })
    },
    [checkEdgeSnap]
  )

  // 鼠标事件处理
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)

    if (!isDragging && !isPinned) {
      if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current)
      drawerTimerRef.current = setTimeout(() => {
        onMouseEnter()
      }, DRAWER_DELAY)
    }
  }, [isDragging, isPinned, onMouseEnter])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (drawerTimerRef.current) {
      clearTimeout(drawerTimerRef.current)
      drawerTimerRef.current = null
    }
  }, [])

  // 拖拽处理
  const handleDragStart = useCallback(() => {
    if (!isPinned) {
      setIsDragging(true)
    }
  }, [isPinned])

  const handleDragEnd = useCallback(
    async (_: any, info: any) => {
      setIsDragging(false)
      const newX = position.x + info.offset.x
      const newY = position.y + info.offset.y
      await savePosition(newX, newY)
    },
    [position, savePosition]
  )

  // 点击球体 - 打开主窗口
  const handleClick = useCallback(async () => {
    if (!isDragging) {
      await invoke('window_show_main')
    }
  }, [isDragging])

  // 切换固定状态
  const togglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPinned(prev => !prev)
  }, [])

  // 打开设置
  const openSettings = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    await invoke('window_show_settings')
  }, [])

  if (!isReady) return null

  const showControls = isHovered && !isDragging

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none"
      style={{
        background: 'transparent',
        cursor: isDragging ? 'grabbing' : isPinned ? 'default' : 'grab',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative"
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
        drag={!isPinned}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 0.92 }}
      >
        {/* 光晕效果 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isDragging
              ? '0 0 0 0 rgba(99, 102, 241, 0)'
              : isHovered
                ? '0 0 40px rgba(99, 102, 241, 0.5), 0 0 80px rgba(99, 102, 241, 0.2)'
                : showPulse
                  ? '0 0 30px rgba(99, 102, 241, 0.4)'
                  : '0 4px 20px rgba(99, 102, 241, 0.3)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* 球体主体 */}
        <motion.div
          className="relative w-full h-full rounded-full overflow-hidden cursor-pointer"
          onClick={handleClick}
          animate={{ scale: isHovered && !isDragging ? 1.05 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* 渐变背景 */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
            }}
          />

          {/* 内发光 */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 50%)',
            }}
          />

          {/* 脉冲环 */}
          <AnimatePresence>
            {showPulse && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/50"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* 图标 */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Clipboard size={24} strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* 徽章 */}
        <AnimatePresence mode="wait">
          {noteCount > 0 && (
            <motion.div
              key={noteCount}
              className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1 shadow-lg border-2 border-white dark:border-slate-900"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {noteCount > 99 ? '99+' : noteCount}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 控制按钮 */}
        <AnimatePresence>
          {showControls && (
            <>
              {/* 固定按钮 - 左侧 */}
              <motion.button
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary border border-slate-100 dark:border-slate-700"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePin}
                title={isPinned ? '取消固定' : '固定位置'}
              >
                <Pin size={14} className={isPinned ? 'fill-primary text-primary' : ''} />
              </motion.button>

              {/* 设置按钮 - 上方 */}
              <motion.button
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary border border-slate-100 dark:border-slate-700"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={openSettings}
                title="设置"
              >
                <Settings size={14} />
              </motion.button>

              {/* 拖拽提示 - 右侧（仅在未固定时） */}
              {!isPinned && (
                <motion.div
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 shadow flex items-center justify-center text-slate-400"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
                >
                  <GripVertical size={14} />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* 提示文字 - 底部 */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-12 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-lg whitespace-nowrap shadow-xl pointer-events-none"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles size={10} className="text-yellow-400" />
                {noteCount} 条笔记
              </span>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-white rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 边缘磁吸指示 */}
        <AnimatePresence>
          {isNearEdge && !isHovered && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
