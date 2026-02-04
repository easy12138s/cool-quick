import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Copy, Sparkles, Shield } from 'lucide-react'

interface PopupProps {
  content: string
  contentType: string
  autoCloseSeconds: number
  sourceApp?: string
  onSave: () => void
  onDismiss: () => void
}

// 类型配置
const typeConfig: Record<string, {
  icon: string
  label: string
  gradient: string
  shadow: string
  textColor: string
}> = {
  phone: {
    icon: '📱',
    label: '手机号',
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    shadow: 'shadow-blue-500/30',
    textColor: 'text-blue-600'
  },
  email: {
    icon: '✉️',
    label: '邮箱',
    gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/30',
    textColor: 'text-emerald-600'
  },
  url: {
    icon: '🔗',
    label: '网址',
    gradient: 'from-violet-500 via-violet-600 to-purple-600',
    shadow: 'shadow-violet-500/30',
    textColor: 'text-violet-600'
  },
  code: {
    icon: '💻',
    label: '代码',
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    shadow: 'shadow-amber-500/30',
    textColor: 'text-amber-600'
  },
  password: {
    icon: '🔐',
    label: '密码',
    gradient: 'from-rose-500 via-rose-600 to-pink-600',
    shadow: 'shadow-rose-500/30',
    textColor: 'text-rose-600'
  },
  text: {
    icon: '📝',
    label: '文本',
    gradient: 'from-slate-500 via-slate-600 to-gray-600',
    shadow: 'shadow-slate-500/30',
    textColor: 'text-slate-600'
  },
}

// 密码遮罩
const maskPassword = (content: string): string => {
  const length = Math.min(content.length, 16)
  return '•'.repeat(length)
}

// 内容截断
const truncateContent = (content: string, maxLength: number = 120): string => {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

const Popup = memo<PopupProps>(({
  content,
  contentType,
  autoCloseSeconds,
  sourceApp,
  onSave,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(autoCloseSeconds)
  const [isHovered, setIsHovered] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  
  const progressRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const config = typeConfig[contentType] || typeConfig.text
  const isPassword = contentType === 'password'
  
  const displayContent = isPassword && !showPassword 
    ? maskPassword(content) 
    : truncateContent(content)

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0 && !isHovered && !isSaving) {
      timerRef.current = setTimeout(() => {
        setCountdown(c => c - 1)
      }, 1000)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    } else if (countdown === 0 && !isHovered && !isSaving) {
      handleDismiss()
    }
  }, [countdown, isHovered, isSaving])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 关闭
      if (e.key === 'Escape') {
        e.preventDefault()
        handleDismiss()
      }
      // Enter 保存
      if (e.key === 'Enter' && !e.repeat && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        handleSave()
      }
      // Ctrl/Cmd + C 复制
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleCopy()
      }
      // Space 切换密码显示
      if (e.key === ' ' && isPassword) {
        e.preventDefault()
        setShowPassword(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPassword])

  const handleDismiss = useCallback(() => {
    if (isSaving || isExiting) return
    setIsExiting(true)
    setTimeout(() => onDismiss(), 300)
  }, [onDismiss, isSaving, isExiting])

  const handleSave = useCallback(async () => {
    if (isSaving || isExiting) return
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      setIsSaving(false)
    }
  }, [onSave, isSaving, isExiting])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content])

  const progressPercent = (countdown / autoCloseSeconds) * 100

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-transparent">
      <motion.div
        className={`w-[320px] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl ${config.shadow} border border-slate-200/50 dark:border-slate-700/50`}
        initial={{ opacity: 0, scale: 0.85, y: 30, filter: 'blur(20px)' }}
        animate={{ 
          opacity: isExiting ? 0 : 1, 
          scale: isExiting ? 0.9 : 1, 
          y: isExiting ? -20 : 0,
          filter: isExiting ? 'blur(10px)' : 'blur(0px)'
        }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 30,
          mass: 0.8
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header with gradient */}
        <div className={`relative px-5 py-4 bg-gradient-to-r ${config.gradient} text-white overflow-hidden`}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <motion.div 
              className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div 
              className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full blur-2xl"
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
          
          {/* Content */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-2xl"
                initial={{ rotate: -15, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              >
                {config.icon}
              </motion.span>
              <div>
                <span className="font-semibold text-sm">{config.label}</span>
                {sourceApp && (
                  <motion.p 
                    className="text-xs text-white/70 flex items-center gap-1 mt-0.5"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Sparkles size={10} />
                    来自 {sourceApp}
                  </motion.p>
                )}
              </div>
            </div>
            
            <motion.button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              aria-label="关闭"
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-5">
          {/* Content display */}
          <motion.div 
            className="relative bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className={`text-sm ${isPassword ? 'font-mono tracking-wider' : 'font-mono'} text-slate-800 dark:text-slate-200 break-all leading-relaxed`}>
              {displayContent}
            </p>
            
            {/* Password toggle */}
            {isPassword && (
              <motion.button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-700 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={showPassword ? '隐藏密码' : '显示密码'}
              >
                <Shield size={14} />
              </motion.button>
            )}
          </motion.div>

          {/* Actions */}
          <motion.div 
            className="flex items-center justify-between mt-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Countdown indicator */}
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 transform -rotate-90">
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <motion.circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    className={config.textColor}
                    strokeDasharray={75.4}
                    strokeDashoffset={75.4 * (1 - progressPercent / 100)}
                    style={{ transition: isHovered ? 'none' : 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-500">
                  {countdown}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {isHovered ? '已暂停' : '秒后关闭'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Copy button */}
              <motion.button
                onClick={handleCopy}
                disabled={isCopied}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <AnimatePresence mode="wait">
                  {isCopied ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2 text-emerald-600"
                    >
                      <Check size={16} />
                      已复制
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Copy size={16} />
                      复制
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Save button */}
              <motion.button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r ${config.gradient} rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <Check size={16} />
                )}
                {isSaving ? '保存中' : '保存'}
              </motion.button>
            </div>
          </motion.div>

          {/* Keyboard hints */}
          <motion.div 
            className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">Enter</kbd>
              保存
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">Esc</kbd>
              关闭
            </span>
            {isPassword && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">Space</kbd>
                显示
              </span>
            )}
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            ref={progressRef}
            className={`h-full bg-gradient-to-r ${config.gradient}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ 
              duration: isHovered ? 0 : 1, 
              ease: 'linear'
            }}
          />
        </div>
      </motion.div>
    </div>
  )
})

Popup.displayName = 'Popup'

export default Popup
