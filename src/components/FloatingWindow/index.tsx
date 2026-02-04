import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clipboard, Sparkles, Pin, Settings, GripVertical } from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { currentMonitor } from '@tauri-apps/api/window'
import { AppConfig } from '../../stores/useConfigStore'

interface FloatingWindowProps {
  onMouseEnter: () => void
  config: AppConfig | null
  noteCount?: number
}

// 磁吸边缘检测
const SNAP_THRESHOLD = 20
const EDGE_MARGIN = 8

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  onMouseEnter,
  noteCount = 0
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isNearEdge, setIsNearEdge] = useState(false)
  
  const orbSize = 48
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 初始化位置
  useEffect(() => {
    const initPosition = async () => {
      try {
        const cfg: any = await invoke('config_get')
        const monitor = await currentMonitor()
        
        if (monitor) {
          const { width, height } = monitor.size
          
          if (cfg?.floating_position) {
            setPosition(cfg.floating_position)
          } else {
            // 默认右侧居中
            const defaultPos = {
              x: width - orbSize - 24,
              y: height / 2 - orbSize / 2
            }
            setPosition(defaultPos)
            await invoke('window_set_position', defaultPos)
          }
        }
      } catch (e) {
        console.error('Failed to init position:', e)
      }
    }
    initPosition()
  }, [])

  // 新内容脉冲动画
  useEffect(() => {
    if (noteCount > 0) {
      setShowPulse(true)
      const timer = setTimeout(() => setShowPulse(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [noteCount])

  // 检测边缘磁吸
  const checkEdgeSnap = async (x: number, y: number) => {
    const monitor = await currentMonitor()
    if (!monitor) return { x, y }

    const { width, height } = monitor.size
    let newX = x
    let newY = y
    let snapped = false

    // 左边缘
    if (x < SNAP_THRESHOLD) {
      newX = EDGE_MARGIN
      snapped = true
    }
    // 右边缘
    else if (x > width - orbSize - SNAP_THRESHOLD) {
      newX = width - orbSize - EDGE_MARGIN
      snapped = true
    }
    // 上边缘
    if (y < SNAP_THRESHOLD) {
      newY = EDGE_MARGIN
      snapped = true
    }
    // 下边缘
    else if (y > height - orbSize - SNAP_THRESHOLD) {
      newY = height - orbSize - EDGE_MARGIN
      snapped = true
    }

    setIsNearEdge(snapped)
    return { x: newX, y: newY }
  }

  // 保存位置
  const savePosition = async (x: number, y: number) => {
    const snapped = await checkEdgeSnap(x, y)
    setPosition(snapped)
    await invoke('config_update', {
      updates: { floating_position: snapped }
    })
    await invoke('window_set_position', snapped)
  }

  // 拖拽开始
  const handleDragStart = () => {
    setIsDragging(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
  }

  // 拖拽结束
  const handleDragEnd = async (_: any, info: any) => {
    setIsDragging(false)
    const newX = position.x + info.offset.x
    const newY = position.y + info.offset.y
    await savePosition(newX, newY)
  }

  // 悬停处理
  const handleMouseEnter = () => {
    setIsHovered(true)
    
    // 延迟显示抽屉
    drawerTimeoutRef.current = setTimeout(() => {
      if (!isDragging) {
        onMouseEnter()
      }
    }, 300)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (drawerTimeoutRef.current) {
      clearTimeout(drawerTimeoutRef.current)
    }
    // 延迟隐藏控制按钮
    controlsTimeoutRef.current = setTimeout(() => {
      // 控制按钮通过 isHovered 状态自动隐藏
    }, 200)
  }

  // 切换固定
  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newPinned = !isPinned
    setIsPinned(newPinned)
    localStorage.setItem('floatingWindowPinned', JSON.stringify(newPinned))
  }

  // 打开设置
  const openSettings = (e: React.MouseEvent) => {
    e.stopPropagation()
    invoke('window_show_settings')
  }

  // 打开主窗口
  const openMainWindow = () => {
    invoke('window_show_main')
  }

  return (
    <div 
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'transparent' }}
    >
      <motion.div
        className="relative"
        style={{ width: orbSize, height: orbSize }}
        drag={!isPinned}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileDrag={{ scale: 0.95, cursor: 'grabbing' }}
      >
        {/* 外层光晕 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isDragging
              ? '0 0 0 0 rgba(99, 102, 241, 0)'
              : isHovered
                ? '0 0 30px rgba(99, 102, 241, 0.4), 0 0 60px rgba(99, 102, 241, 0.2)'
                : showPulse
                  ? '0 0 20px rgba(99, 102, 241, 0.3)'
                  : '0 4px 20px rgba(99, 102, 241, 0.25)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* 主球体 */}
        <motion.div
          className="relative w-full h-full rounded-full cursor-pointer overflow-hidden"
          onClick={openMainWindow}
          animate={{
            scale: isHovered ? 1.08 : 1,
          }}
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
            className="absolute inset-0 opacity-60"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)',
            }}
          />

          {/* 脉冲环 */}
          <AnimatePresence>
            {showPulse && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/50"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* 图标 */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Clipboard size={22} strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* 徽章 */}
        <AnimatePresence mode="wait">
          {noteCount > 0 && (
            <motion.div
              key={noteCount}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1 shadow-lg border-2 border-white dark:border-slate-900"
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
          {isHovered && !isDragging && (
            <>
              {/* 固定按钮 */}
              <motion.button
                className="absolute -left-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary border border-slate-100 dark:border-slate-700"
                initial={{ scale: 0, x: 10, opacity: 0 }}
                animate={{ scale: 1, x: 0, opacity: 1 }}
                exit={{ scale: 0, x: 10, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePin}
                title={isPinned ? '取消固定' : '固定位置'}
              >
                <Pin size={12} className={isPinned ? 'fill-primary text-primary' : ''} />
              </motion.button>

              {/* 设置按钮 */}
              <motion.button
                className="absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary border border-slate-100 dark:border-slate-700"
                initial={{ scale: 0, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0, y: 10, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={openSettings}
                title="设置"
              >
                <Settings size={12} />
              </motion.button>

              {/* 拖拽提示 */}
              {!isPinned && (
                <motion.div
                  className="absolute -right-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-400 cursor-grab border border-slate-100 dark:border-slate-700"
                  initial={{ scale: 0, x: -10, opacity: 0 }}
                  animate={{ scale: 1, x: 0, opacity: 1 }}
                  exit={{ scale: 0, x: -10, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
                  whileHover={{ scale: 1.15, cursor: 'grab' }}
                >
                  <GripVertical size={12} />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* 提示文字 */}
        <AnimatePresence>
          {isHovered && !isDragging && (
            <motion.div
              className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-lg whitespace-nowrap shadow-xl"
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles size={10} className="text-yellow-400" />
                {noteCount} 条笔记
              </span>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-white rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 边缘磁吸指示 */}
        <AnimatePresence>
          {isNearEdge && !isHovered && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
