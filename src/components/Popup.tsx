import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, X, Edit3, Clock, Sparkles, Copy, Eye, EyeOff,
  Tag, CheckCircle2, RotateCcw, Keyboard
} from 'lucide-react'

interface PopupProps {
  content: string
  contentType: string
  autoCloseSeconds: number
  sourceApp?: string
  onSave: () => void
  onDismiss: () => void
}

const typeIcons: Record<string, string> = {
  phone: '📱',
  email: '✉️',
  url: '🔗',
  code: '💻',
  password: '🔐',
  text: '📝',
}

const typeLabels: Record<string, string> = {
  phone: '手机号',
  email: '邮箱',
  url: '网址',
  code: '代码片段',
  password: '密码',
  text: '文本',
}

const typeGradients: Record<string, string> = {
  phone: 'from-blue-500 to-cyan-500',
  email: 'from-green-500 to-emerald-500',
  url: 'from-purple-500 to-pink-500',
  code: 'from-amber-500 to-orange-500',
  password: 'from-rose-500 to-red-500',
  text: 'from-gray-500 to-slate-500',
}

const typeGlows: Record<string, string> = {
  phone: 'shadow-blue-500/30',
  email: 'shadow-green-500/30',
  url: 'shadow-purple-500/30',
  code: 'shadow-amber-500/30',
  password: 'shadow-rose-500/30',
  text: 'shadow-gray-500/30',
}

const Popup: React.FC<PopupProps> = ({
  content,
  contentType,
  autoCloseSeconds,
  sourceApp,
  onSave,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(autoCloseSeconds)
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [showPassword, setShowPassword] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const isPassword = contentType === 'password'
  const displayContent = isPassword && !showPassword 
    ? '•'.repeat(Math.min(content.length, 20))
    : content

  useEffect(() => {
    if (countdown > 0 && !isHovered && !isEditing) {
      const timer = setTimeout(() => {
        setCountdown(c => c - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !isHovered && !isEditing) {
      onDismiss()
    }
  }, [countdown, isHovered, isEditing, onDismiss])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false)
        } else {
          onDismiss()
        }
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, onDismiss])

  const handleSave = useCallback(() => {
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    onSave()
  }, [onSave])

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }, [content])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const progressPercent = (countdown / autoCloseSeconds) * 100
  const gradient = typeGradients[contentType] || typeGradients.text
  const glowColor = typeGlows[contentType] || typeGlows.text

  return (
    <motion.div
      className={`w-[400px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 ${glowColor} shadow-lg`}
      initial={{ opacity: 0, scale: 0.8, y: 30, rotateX: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20, rotateX: 10 }}
      transition={{ 
        type: 'spring',
        stiffness: 400,
        damping: 30
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ perspective: 1000 }}
    >
      {/* Header with animated gradient */}
      <div className={`relative px-5 py-4 bg-gradient-to-r ${gradient} text-white overflow-hidden`}>
        {/* Animated background shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.span 
              className="text-2xl"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {typeIcons[contentType] || '📝'}
            </motion.span>
            <div>
              <span className="font-semibold text-lg">{typeLabels[contentType] || '文本'}</span>
              {sourceApp && (
                <p className="text-xs text-white/70">来自: {sourceApp}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Copy button in header */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
              title="复制到剪贴板"
            >
              <AnimatePresence mode="wait">
                {isCopied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <CheckCircle2 size={18} className="text-green-300" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Copy size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            
            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="关闭 (Esc)"
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-5">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-28 p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 bg-gray-50 dark:bg-gray-800 transition-all"
              autoFocus
              placeholder="编辑内容..."
            />
            
            {/* Tags in edit mode */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <motion.span
                  key={tag}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
                >
                  <Tag size={10} />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                </motion.span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="添加标签..."
                  className="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={handleAddTag}
                  className="p-1 text-xs bg-primary-500 text-white rounded-full hover:bg-primary-600"
                >
                  <Check size={10} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
              <p className={`text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all leading-relaxed ${
                content.length > 200 ? 'line-clamp-5' : ''
              }`}>
                {displayContent}
              </p>
              
              {content.length > 200 && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Sparkles size={10} />
                  共 {content.length} 字符 · 点击编辑查看完整内容
                </p>
              )}
            </div>

            {/* Password toggle */}
            {isPassword && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </motion.button>
            )}
          </div>
        )}

        {/* Quick actions bar */}
        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-3">
            {/* Countdown indicator */}
            <motion.div 
              className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-full"
              animate={{ opacity: isHovered ? 0.5 : 1 }}
            >
              <Clock size={12} className={countdown <= 2 ? 'text-red-500' : ''} />
              <span className={countdown <= 2 ? 'text-red-500 font-medium' : ''}>
                {isHovered ? '已暂停' : `${countdown}s`}
              </span>
            </motion.div>

            {/* Keyboard shortcuts hint */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
              <Keyboard size={10} />
              <span>Cmd+Enter 保存 · Esc 关闭</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setIsEditing(false)
                    setEditedContent(content)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setIsEditing(false)
                    handleSave()
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30"
                >
                  <Check size={14} />
                  保存
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <Edit3 size={14} />
                  编辑
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDismiss}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  忽略
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl transition-all shadow-lg shadow-primary-500/30"
                >
                  <Check size={14} />
                  保存
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Countdown progress bar with gradient */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradient}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
        
        {/* Shimmer effect on progress bar */}
        {!isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
    </motion.div>
  )
}

export default Popup
