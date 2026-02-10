import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Copy, Sparkles, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { useCountdown } from './useCountdown'
import { useClipboardCopy } from './useClipboardCopy'
import { typeConfig, maskPassword, truncateContent, formatCodePreview } from './utils'

interface PopupProps {
  content: string
  contentType: string
  autoCloseSeconds?: number
  sourceApp?: string
  onSave: () => Promise<void> | void
  onDismiss: () => void
  onIgnoreType?: (type: string) => void
}

const MIN_POPUP_LENGTH = 10

export const Popup: React.FC<PopupProps> = ({
  content,
  contentType,
  autoCloseSeconds = 5,
  sourceApp,
  onSave,
  onDismiss,
  onIgnoreType,
}) => {
  const [isExiting, setIsExiting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const config = typeConfig[contentType] || typeConfig.text
  const isPassword = contentType === 'password'
  const isUrl = contentType === 'url'

  // 内容预览
  const displayContent =
    isPassword && !showPassword
      ? maskPassword(content)
      : contentType === 'code'
        ? formatCodePreview(truncateContent(content, 600))
        : truncateContent(content, 400)

  // 倒计时 hook
  const { seconds, progress, isPaused, pause, resume } = useCountdown({
    initialSeconds: autoCloseSeconds,
    onComplete: handleDismiss,
    autoStart: true,
  })

  // 复制 hook
  const { isCopied, copy } = useClipboardCopy({
    onSuccess: () => {
      // 复制成功后延长关闭时间
      pause()
    },
    successDuration: 2000,
  })

  // 处理关闭
  function handleDismiss() {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => onDismiss(), 250)
  }

  // 处理保存
  const handleSave = useCallback(async () => {
    console.log('Popup handleSave called')
    if (isSaving || isExiting) {
      console.log('Early return: isSaving=', isSaving, 'isExiting=', isExiting)
      return
    }
    setIsSaving(true)
    pause()

    try {
      await onSave()
      setSaveSuccess(true)
      setTimeout(() => {
        handleDismiss()
      }, 800)
    } catch (error) {
      console.error('Save failed:', error)
      setIsSaving(false)
      resume()
    }
  }, [isSaving, isExiting, onSave, pause, resume])

  // 处理复制
  const handleCopy = useCallback(async () => {
    await copy(content)
  }, [content, copy])

  // 处理 URL 打开
  const handleOpenUrl = useCallback(() => {
    if (isUrl) {
      window.open(content, '_blank')
    }
  }, [isUrl, content])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 关闭
      if (e.key === 'Escape') {
        e.preventDefault()
        handleDismiss()
      }
      // Enter 保存
      if (e.key === 'Enter' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+Enter 快速保存（不与其他冲突的快捷方式）
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
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
  }, [isPassword, handleCopy, handleSave])

  // 鼠标悬停暂停/恢复
  useEffect(() => {
    if (isHovered) {
      pause()
    } else if (!isCopied) {
      resume()
    }
  }, [isHovered, isCopied, pause, resume])

  // 内容太短不显示
  if (content.length < MIN_POPUP_LENGTH) {
    return null
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-transparent">
      <motion.div
        className={`w-[340px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl ${config.shadow} border border-slate-200/50 dark:border-slate-700/50 flex flex-col`}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          scale: isExiting ? 0.95 : 1,
          y: isExiting ? -10 : 0,
        }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div
          className={`relative px-4 py-3 bg-gradient-to-r ${config.gradient} text-white flex-shrink-0`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{config.icon}</span>
              <div>
                <span className="font-semibold text-sm">{config.label}</span>
                {sourceApp && (
                  <p className="text-[10px] text-white/80 flex items-center gap-1">
                    <Sparkles size={8} />
                    来自 {sourceApp}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* 更多操作按钮 */}
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <span className="text-white/80 text-lg">⋮</span>
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 更多操作菜单 */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-2 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[140px] z-10"
              >
                {onIgnoreType && (
                  <button
                    onClick={() => {
                      onIgnoreType(contentType)
                      handleDismiss()
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    忽略此类内容
                  </button>
                )}
                <button
                  onClick={() => {
                    localStorage.setItem('popupAutoClose', 'false')
                    handleDismiss()
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  不再自动关闭
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content - 只有pre区域滚动 */}
        <div className="p-4 flex-1 min-h-0 flex flex-col">
          <div className="relative bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 group flex-1 overflow-hidden">
            <pre
              className={`text-xs ${isPassword ? 'font-mono tracking-wider' : 'font-mono'} text-slate-800 dark:text-slate-200 break-all leading-relaxed whitespace-pre-wrap p-3.5 max-h-[200px] overflow-y-auto scrollbar-thin`}
            >
              {displayContent}
            </pre>

            {/* 密码切换 */}
            {isPassword && (
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                title={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}

            {/* URL 打开按钮 */}
            {isUrl && (
              <button
                onClick={handleOpenUrl}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-primary bg-white dark:bg-slate-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                title="打开链接"
              >
                <ExternalLink size={12} />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 flex-shrink-0">
            {/* Countdown */}
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7">
                <svg className="w-7 h-7 transform -rotate-90">
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    className={isPaused ? 'text-primary' : config.textColor}
                    strokeDasharray={69.1}
                    strokeDashoffset={69.1 * (1 - progress / 100)}
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-slate-500">
                  {Math.ceil(seconds)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">{isPaused ? '已暂停' : '秒后关闭'}</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {/* Copy */}
              <button
                onClick={handleCopy}
                disabled={isCopied}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isCopied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                {isCopied ? '已复制' : '复制'}
              </button>

              {/* Save */}
              <button
                onClick={async () => {
                  console.log('=== SAVE BUTTON CLICKED ===')
                  if (isSaving || isExiting) {
                    console.log('Blocked: isSaving=', isSaving, 'isExiting=', isExiting)
                    return
                  }
                  setIsSaving(true)
                  pause()
                  try {
                    console.log('Calling onSave...')
                    await onSave()
                    console.log('onSave completed')
                    setSaveSuccess(true)
                    setTimeout(() => {
                      handleDismiss()
                    }, 800)
                  } catch (error) {
                    console.error('Save failed:', error)
                    setIsSaving(false)
                    resume()
                  }
                }}
                disabled={isSaving || saveSuccess}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all ${
                  saveSuccess
                    ? 'bg-emerald-500'
                    : `bg-gradient-to-r ${config.gradient} hover:shadow-lg`
                } disabled:opacity-50`}
              >
                {isSaving ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saveSuccess ? (
                  <Check size={12} />
                ) : (
                  <span>保存</span>
                )}
                {saveSuccess && <span>已保存</span>}
              </button>
            </div>
          </div>

          {/* Keyboard hints */}
          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[9px] text-slate-400 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono text-[8px]">
                Enter
              </kbd>
              /
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono text-[8px]">
                Ctrl+Enter
              </kbd>
              保存
            </span>
            <span className="text-[9px] text-slate-400 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono text-[8px]">
                Esc
              </kbd>
              关闭
            </span>
            {isPassword && (
              <span className="text-[9px] text-slate-400 flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono text-[8px]">
                  Space
                </kbd>
                显示
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${config.gradient}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </motion.div>
    </div>
  )
}

export default Popup
