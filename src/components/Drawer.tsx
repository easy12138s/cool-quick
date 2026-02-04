import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, X, Star, Trash2, Archive, Download, 
  Filter, Clock, Copy, CheckCircle2, Sparkles, LayoutGrid, List,
  ChevronDown, Clipboard
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Note, AppConfig } from '../types'

interface DrawerProps {
  notes: Note[]
  onCopy: (content: string) => void
  onRefresh: () => void
  config: AppConfig | null
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

const Drawer: React.FC<DrawerProps> = ({ notes, onCopy, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; note: Note } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Filter and sort notes
  useEffect(() => {
    let filtered = notes

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(note =>
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.note_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply type filter
    if (selectedType) {
      filtered = filtered.filter(note => note.note_type === selectedType)
    }

    // Apply sorting
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setSelectedNote(null)
      }
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }

    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [contextMenu])

  const handleCopy = async (note: Note) => {
    onCopy(note.content)
    setCopiedId(note.id)
    
    // Show copied feedback
    setTimeout(() => setCopiedId(null), 2000)

    try {
      await invoke('update_note', { id: note.id, useCount: note.use_count + 1 })
    } catch (e) {
      console.error('Failed to update use count:', e)
    }
  }

  const handleFavorite = async (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await invoke('update_note', { id: note.id, isFavorite: !note.is_favorite })
      onRefresh()
    } catch (err) {
      console.error('Failed to update favorite:', err)
    }
  }

  const handleDelete = async (noteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await invoke('delete_note', { id: noteId })
      onRefresh()
      setContextMenu(null)
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const handleArchive = async (_noteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await invoke('archive_notes', { byDateDays: 0, byType: null })
      onRefresh()
      setContextMenu(null)
    } catch (err) {
      console.error('Failed to archive:', err)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, note })
  }

  const handleExport = async () => {
    try {
      const data = await invoke<string>('export_data', { format: 'json' })
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coolquick-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
      
      // Show success toast
      const toast = document.createElement('div')
      toast.className = 'fixed bottom-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg z-50'
      toast.textContent = '导出成功!'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (err) {
      console.error('Failed to export:', err)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
    } else {
      return format(date, 'MM-dd HH:mm')
    }
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
        {/* Search bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索笔记... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white dark:focus:bg-gray-800 transition-all border border-transparent focus:border-primary-500/30"
            />
            {searchQuery && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </div>
          
          {/* View mode toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="列表视图"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="网格视图"
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
          
          {/* Type filters */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
                selectedType === null 
                  ? 'bg-primary-500 text-white shadow-sm' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              全部
            </button>
            {uniqueTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedType === type
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{typeIcons[type]}</span>
                <span className="capitalize">{typeLabels[type] || type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                <span className="text-xs text-gray-500">排序:</span>
                {(['time', 'type', 'favorite'] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      sortMode === mode
                        ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {mode === 'time' && <Clock size={12} className="inline mr-1" />}
                    {mode === 'type' && <LayoutGrid size={12} className="inline mr-1" />}
                    {mode === 'favorite' && <Star size={12} className="inline mr-1" />}
                    {mode === 'time' ? '时间' : mode === 'type' ? '类型' : '收藏'}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${colors.bg} ${colors.border} hover:shadow-md ${
                  selectedNote === note.id ? 'ring-2 ring-primary-500/50' : ''
                } ${viewMode === 'grid' ? 'inline-block w-[calc(50%-4px)]' : 'block'}`}
                onClick={() => handleCopy(note)}
                onContextMenu={(e) => handleContextMenu(e, note)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <motion.div 
                    className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center text-lg border ${colors.border}`}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {typeIcons[note.note_type]}
                  </motion.div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${viewMode === 'grid' ? 'line-clamp-2' : 'truncate'}`}>
                        {note.content.length > (viewMode === 'grid' ? 60 : 100) 
                          ? note.content.slice(0, viewMode === 'grid' ? 60 : 100) + '...' 
                          : note.content}
                      </p>
                      
                      {/* Copy feedback */}
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
                    
                    {/* Meta info */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${colors.bg} ${colors.text} ${colors.border} font-medium`}>
                        {typeLabels[note.note_type] || note.note_type}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(note.created_at)}
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
                      {note.use_count > 0 && (
                        <span className="text-xs text-gray-400">
                          使用 {note.use_count} 次
                        </span>
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
                    onClick={(e) => handleFavorite(note, e)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      note.is_favorite 
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' 
                        : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-yellow-500'
                    }`}
                    title={note.is_favorite ? '取消收藏' : '收藏'}
                  >
                    <Star size={14} className={note.is_favorite ? 'fill-yellow-500' : ''} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleArchive(note.id, e)}
                    className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                    title="归档"
                  >
                    <Archive size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleDelete(note.id, e)}
                    className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    title="删除"
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
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
            >
              <Clipboard size={64} className="mb-4 opacity-30" />
            </motion.div>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
              {searchQuery ? '没有找到匹配的笔记' : '暂无笔记'}
            </p>
            <p className="text-sm text-gray-400">
              {searchQuery ? '试试其他关键词' : '复制内容时会自动保存到这里'}
            </p>
            {!searchQuery && (
              <motion.div 
                className="mt-4 flex items-center gap-2 text-xs text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles size={12} />
                <span>试试复制一段文字、链接或代码</span>
              </motion.div>
            )}
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors font-medium"
          >
            <Download size={14} />
            导出
          </motion.button>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
            style={{ 
              left: Math.min(contextMenu.x, window.innerWidth - 180), 
              top: Math.min(contextMenu.y, window.innerHeight - 200) 
            }}
          >
            <button
              onClick={() => {
                handleCopy(contextMenu.note)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Copy size={14} className="text-gray-500" />
              复制
            </button>
            <button
              onClick={() => {
                handleFavorite(contextMenu.note)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Star size={14} className={contextMenu.note.is_favorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'} />
              {contextMenu.note.is_favorite ? '取消收藏' : '收藏'}
            </button>
            <button
              onClick={() => {
                handleArchive(contextMenu.note.id)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Archive size={14} className="text-gray-500" />
              归档
            </button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <button
              onClick={() => {
                handleDelete(contextMenu.note.id)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={14} />
              删除
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default Drawer
