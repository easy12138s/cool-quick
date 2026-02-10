import React, { forwardRef, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Star, Trash2, CheckCircle2 } from 'lucide-react'
import type { Note } from '../../stores/useNotesStore'

interface NoteItemProps {
  note: Note
  isCopied: boolean
  isSelected: boolean
  onCopy: (note: Note) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
  onSelect: (id: string) => void
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

const stripHtml = (html: string): string => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export const NoteItem = forwardRef<HTMLDivElement, NoteItemProps>(
  ({ note, isCopied, isSelected, onCopy, onDelete, onToggleFavorite, onSelect, index }, ref) => {
    const [showDelete, setShowDelete] = useState(false)
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isLongPress = useRef(false)

    useEffect(() => {
      setShowDelete(false)
    }, [note.id])

    useEffect(() => {
      return () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current)
      }
    }, [])

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

    const handleMouseLeave = useCallback(() => {
      // 鼠标移出卡片时，清除长按定时器并隐藏删除按钮
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      if (showDelete) {
        setShowDelete(false)
      }
      isLongPress.current = false
    }, [showDelete])

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
        onDelete(note.id)
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

    return (
      <div
        ref={ref}
        className={`relative group rounded-xl border bg-white transition-all ${
          isSelected ? 'border-primary ring-2 ring-primary/20' : colors.border
        } shadow-sm`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {showDelete && (
          <div
            className="absolute inset-0 bg-rose-500 rounded-xl flex items-center justify-center gap-2 z-10 cursor-pointer"
            onClick={handleDelete}
          >
            <Trash2 size={16} className="text-white" />
            <span className="text-white text-sm font-medium">确认删除</span>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center text-base border ${colors.border}`}
            >
              {typeIcons[note.note_type]}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed mb-1 select-text cursor-text">
                {stripHtml(note.content).slice(0, 120)}
                {stripHtml(note.content).length > 120 ? '...' : ''}
              </p>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {typeLabels[note.note_type] || note.note_type}
                </span>

                {note.is_favorite && <Star size={10} className="text-amber-500 fill-amber-500" />}

                {isCopied && (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle2 size={10} />
                    已复制
                  </span>
                )}
              </div>
            </div>

            {isSelected && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            )}
          </div>
        </div>

        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          长按删除
        </div>
      </div>
    )
  }
)

NoteItem.displayName = 'NoteItem'
