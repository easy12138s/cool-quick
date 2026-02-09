import { forwardRef, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Trash2, CheckCircle2, GripVertical, Edit3 } from 'lucide-react'
import type { Note } from '../../stores/useNotesStore'

interface NoteItemProps {
  note: Note
  isCopied: boolean
  isSelected: boolean
  onCopy: (note: Note) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
  onSelect: (id: string) => void
  onEdit?: (note: Note) => void
  index: number
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
  code: '代码',
  password: '密码',
  text: '文本',
}

// 提取纯文本内容（去除 HTML 标签）
const stripHtml = (html: string): string => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export const NoteItem = forwardRef<HTMLDivElement, NoteItemProps>(
  (
    { note, isCopied, isSelected, onCopy, onDelete, onToggleFavorite, onSelect, onEdit, index },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isLongPress = useRef(false)

    const colors = useMemo(() => {
      const map: Record<string, { bg: string; text: string; border: string }> = {
        phone: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
        email: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
        url: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
        code: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
        password: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
        text: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
      }
      return map[note.note_type] || map.text
    }, [note.note_type])

    // 长按删除
    const handleMouseDown = useCallback(() => {
      isLongPress.current = false
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true
        setShowDelete(true)
      }, 600)
    }, [])

    const handleMouseUp = useCallback(() => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }, [])

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (isLongPress.current) return

        if (e.shiftKey) {
          onSelect(note.id)
        } else if (showDelete) {
          setShowDelete(false)
        } else {
          onCopy(note)
        }
      },
      [isLongPress, showDelete, onCopy, onSelect, note]
    )

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDeleting(true)
        setTimeout(() => onDelete(note.id), 200)
      },
      [note.id, onDelete]
    )

    const handleFavorite = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleFavorite(note.id, note.is_favorite)
      },
      [note.id, note.is_favorite, onToggleFavorite]
    )

    useEffect(() => {
      return () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current)
      }
    }, [])

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: isDeleting ? 0 : 1,
          y: isDeleting ? -10 : 0,
          scale: isDeleting ? 0.9 : 1,
        }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        className={`relative group rounded-xl border bg-white transition-all ${
          isSelected ? 'border-primary ring-2 ring-primary/20' : colors.border
        } ${isHovered ? 'shadow-md' : 'shadow-sm'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        {/* 删除确认层 */}
        <AnimatePresence>
          {showDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-rose-500 rounded-xl flex items-center justify-center gap-2 z-10 cursor-pointer"
              onClick={handleDelete}
            >
              <Trash2 size={16} className="text-white" />
              <span className="text-white text-sm font-medium">确认删除</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-3">
          <div className="flex items-start gap-3">
            {/* 类型图标 */}
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center text-base border ${colors.border}`}
            >
              {typeIcons[note.note_type]}
            </div>

            {/* 内容区 */}
            <div className="flex-1 min-w-0">
              {/* 内容预览 */}
              <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed mb-1">
                {stripHtml(note.content).slice(0, 120)}
                {stripHtml(note.content).length > 120 ? '...' : ''}
              </p>

              {/* 元信息 */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {typeLabels[note.note_type] || note.note_type}
                </span>

                {note.is_favorite && <Star size={10} className="text-amber-500 fill-amber-500" />}

                {isCopied && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[10px] text-emerald-600 flex items-center gap-0.5"
                  >
                    <CheckCircle2 size={10} />
                    已复制
                  </motion.span>
                )}
              </div>
            </div>

            {/* 选中指示器 */}
            {isSelected && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            )}

            {/* 悬停操作 */}
            <AnimatePresence>
              {isHovered && !showDelete && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-1"
                >
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onEdit?.(note)
                    }}
                    className="p-1.5 text-slate-300 hover:text-blue-500 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={handleFavorite}
                    className={`p-1.5 rounded-lg transition-colors ${
                      note.is_favorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                    }`}
                  >
                    <Star size={14} className={note.is_favorite ? 'fill-amber-500' : ''} />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setShowDelete(true)
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 长按提示 */}
        <AnimatePresence>
          {isHovered && !showDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"
            >
              长按删除
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }
)

NoteItem.displayName = 'NoteItem'
