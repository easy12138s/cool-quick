import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Star, Trash2, Archive, Download, Upload,
  Filter, Clock, Copy, CheckCircle2, Sparkles, LayoutGrid, List,
  ChevronDown, Pin, MoreHorizontal, RotateCcw, Settings
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useNotesStore } from '../../stores/useNotesStore'
import { useConfigStore } from '../../stores/useConfigStore'
import type { Note } from '../../types'

interface DrawerProps {
  notes: Note[]
  onCopy: (content: string) => void
  onRefresh: () => void
  config: any
}

type ViewMode = 'list' | 'grid'
type SortMode = 'time' | 'type' | 'favorite'

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

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  phone: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  },
  email: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800'
  },
  url: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800'
  },
  code: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  password: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800'
  },
  text: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700'
  },
}

export const Drawer: React.FC<DrawerProps> = ({ notes, onCopy, onRefresh, config }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; note: Note } | null>(null)
  const [isMouseInside, setIsMouseInside] = useState(true)
  const drawerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { archiveNote, unarchiveNote, toggleFavorite, deleteNote, importNotes, exportNotes } = useNotesStore()

  // Filter and sort notes
  useEffect(() => {
    let filtered = notes

    if (searchQuery.trim()) {
      filtered = filtered.filter(note =>
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.note_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedType) {
      filtered = filtered.filter(note => note.note_type === selectedType)
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case 'favorite':
          if (a.is_favorite !== b.is_favorite) {
            return a.is_favorite ? -1 : 1
          }
          return b.created_at - a.created_at
        case 'type':
          if (a.note_type !== b.note_type) {
            return a.note_type.localeCompare(b.note_type)
          }
          return b.created_at - a.created_at
        case 'time':
        default:
          return b.created_at - a.created_at
      }
    })

    setFilteredNotes(filtered)
  }, [searchQuery, notes, selectedType, sortMode])

  // Auto-hide logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (drawerRef.current) {
        const rect = drawerRef.current.getBoundingClientRect()
        const isInside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom

        if (isInside !== isMouseInside) {
          setIsMouseInside(isInside)

          if (!isInside) {
            // Mouse left - start timer to hide
            hideTimerRef.current = setTimeout(() => {
              invoke('window_hide_drawer')
            }, 500)
          } else {
            // Mouse entered - cancel hide timer
            if (hideTimerRef.current) {
              clearTimeout(hideTimerRef.current)
              hideTimerRef.current = null
            }
          }
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [isMouseInside])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setSelectedNote(null)
        invoke('window_hide_drawer')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCopy = async (note: Note) => {
    onCopy(note.content)
    setCopiedId(note.id)
    setTimeout(() => setCopiedId(null), 2000)

    await invoke('notes_update', {
      id: note.id,
      useCount: note.use_count + 1
    }).catch(() => { })
  }

  const uniqueTypes = Array.from(new Set(notes.map(n => n.note_type)))

  return (
    <motion.div
      ref={drawerRef}
      className="w-[380px] h-[550px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200/50 dark:border-gray-700/50"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="搜索笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white dark:focus:bg-gray-800 transition-all border border-transparent focus:border-primary-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${showFilters ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            <Filter size={12} />
            筛选
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-all ${selectedType === null ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              全部
            </button>
            {uniqueTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${selectedType === type ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                <span>{typeIcons[type]}</span>
                <span className="capitalize">{typeLabels[type] || type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filteredNotes.map((note, index) => {
            const colors = typeColors[note.note_type] || typeColors.text
            const isCopied = copiedId === note.id

            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: -50 }}
                transition={{
                  delay: index * 0.03,
                  type: 'spring',
                  damping: 25,
                  stiffness: 300
                }}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${colors.bg} ${colors.border} hover:shadow-md ${selectedNote === note.id ? 'ring-2 ring-primary-500/50' : ''} ${viewMode === 'grid' ? 'inline-block w-[calc(50%-4px)]' : 'block'}`}
                onClick={() => handleCopy(note)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center text-lg border ${colors.border}`}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {typeIcons[note.note_type]}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${viewMode === 'grid' ? 'line-clamp-2' : 'truncate'}`}>
                        {note.content.length > (viewMode === 'grid' ? 60 : 100)
                          ? note.content.slice(0, viewMode === 'grid' ? 60 : 100) + '...'
                          : note.content}
                      </p>

                      <AnimatePresence>
                        {isCopied && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="flex-shrink-0 text-green-500"
                          >
                            <CheckCircle2 size={16} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${colors.bg} ${colors.text} ${colors.border} font-medium`}>
                        {typeLabels[note.note_type] || note.note_type}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(note.created_at * 1000), { addSuffix: true, locale: zhCN })}
                      </span>
                      {note.is_favorite && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-yellow-500"
                        >
                          <Star size={12} className="fill-yellow-500" />
                        </motion.span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover actions */}
                <motion.div
                  className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(note.id, note.is_favorite)
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${note.is_favorite ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-yellow-500'}`}
                  >
                    <Star size={14} className={note.is_favorite ? 'fill-yellow-500' : ''} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      archiveNote(note.id)
                    }}
                    className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Archive size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNote(note.id)
                    }}
                    className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Empty state */}
        {filteredNotes.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-48 text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ClipboardList size={64} className="mb-4 opacity-30" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
              {searchQuery ? '没有找到匹配的笔记' : '暂无笔记'}
            </p>
            <p className="text-sm text-gray-400">
              {searchQuery ? '试试其他关键词' : '复制内容时会自动保存到这里'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-transparent to-gray-50/50 dark:to-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">{filteredNotes.length}</span>
          <span>条笔记</span>
          {selectedType && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-primary-600 dark:text-primary-400">
                {typeLabels[selectedType]}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const data = await exportNotes()
              if (data) {
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `coolquick-backup-${new Date().toISOString().split('T')[0]}.json`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors font-medium"
          >
            <Download size={14} />
            导出
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Fix ClipboardList import
import { ClipboardList } from 'lucide-react'
