import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import {
  Search, X, Star, Trash2, Download, Filter, CheckCircle2,
  LayoutGrid, List, ChevronDown, ClipboardList, ExternalLink,
  MoreHorizontal, Clock, Hash
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useNotesStore } from '../../stores/useNotesStore'
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

const typeColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  phone: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-500 to-blue-600'
  },
  email: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  url: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    gradient: 'from-violet-500 to-violet-600'
  },
  code: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    gradient: 'from-amber-500 to-amber-600'
  },
  password: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-600 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    gradient: 'from-rose-500 to-rose-600'
  },
  text: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    gradient: 'from-slate-500 to-slate-600'
  },
}

// 笔记项组件
interface NoteItemProps {
  note: Note
  onCopy: (note: Note) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
  isCopied: boolean
  viewMode: ViewMode
  index: number
}

const NoteItem = React.memo<NoteItemProps>(({
  note,
  onCopy,
  onDelete,
  onToggleFavorite,
  isCopied,
  viewMode,
  index
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const colors = typeColors[note.note_type] || typeColors.text
  const menuRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-100, 0], [0.5, 1])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    setTimeout(() => onDelete(note.id), 250)
  }, [note.id, onDelete])

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite(note.id, note.is_favorite)
  }, [note.id, note.is_favorite, onToggleFavorite])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const threshold = 80
    if (info.offset.x < -threshold) {
      setShowActions(true)
    } else if (info.offset.x > threshold / 2) {
      setShowActions(false)
    }
  }, [])

  // 网格视图
  if (viewMode === 'grid') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ 
          opacity: isDeleting ? 0 : 1, 
          scale: isDeleting ? 0.8 : 1,
          y: isDeleting ? -20 : 0
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25, delay: index * 0.03 }}
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className={`p-4 rounded-2xl cursor-pointer border bg-white dark:bg-slate-900 ${colors.border} transition-shadow duration-200 ${isHovered ? 'shadow-lg' : 'shadow-sm'}`}
          onClick={() => onCopy(note)}
          whileTap={{ scale: 0.98 }}
          style={{ opacity }}
        >
          {/* 头部 */}
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center text-lg border ${colors.border} shadow-sm`}>
              {typeIcons[note.note_type]}
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <motion.button
                onClick={handleFavorite}
                className={`p-2 rounded-lg transition-colors ${note.is_favorite ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Star size={16} className={note.is_favorite ? 'fill-amber-500' : ''} />
              </motion.button>
              <div className="relative" ref={menuRef}>
                <motion.button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                  className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <MoreHorizontal size={16} />
                </motion.button>
                
                {/* 下拉菜单 */}
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1 min-w-[120px] z-10"
                    >
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 内容 */}
          <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-3 mb-3 font-mono leading-relaxed">
            {note.content}
          </p>

          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
              {typeLabels[note.note_type] || note.note_type}
            </span>
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(note.created_at * 1000), { addSuffix: true, locale: zhCN })}
            </span>
          </div>
        </motion.div>

        {/* 复制成功遮罩 */}
        <AnimatePresence>
          {isCopied && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg"
              >
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">已复制</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // 列表视图 - 支持滑动删除
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: isDeleting ? 0 : 1, 
        x: isDeleting ? 100 : 0,
        height: isDeleting ? 0 : 'auto',
        marginBottom: isDeleting ? 0 : 8
      }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: index * 0.02 }}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 删除背景层 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-rose-500 to-rose-600 flex items-center justify-end pr-6 rounded-2xl cursor-pointer shadow-inner"
        initial={{ opacity: 0 }}
        animate={{ opacity: showActions ? 1 : 0 }}
        onClick={handleDelete}
      >
        <motion.div 
          className="flex items-center gap-2 text-white"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: showActions ? 0 : 20, opacity: showActions ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Trash2 size={20} />
          <span className="text-sm font-medium">删除</span>
        </motion.div>
      </motion.div>

      {/* 内容层 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={{ x: showActions ? -100 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className={`relative p-4 rounded-2xl cursor-pointer border bg-white dark:bg-slate-900 ${colors.border} shadow-sm transition-shadow duration-200 ${isHovered ? 'shadow-md' : ''}`}
        onClick={() => !showActions && onCopy(note)}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-start gap-3">
          {/* 图标 */}
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center text-lg border ${colors.border} shadow-sm`}>
            {typeIcons[note.note_type]}
          </div>

          {/* 内容区 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-800 dark:text-slate-200 truncate font-mono leading-relaxed">
                {note.content.length > 70 ? note.content.slice(0, 70) + '...' : note.content}
              </p>

              <AnimatePresence>
                {isCopied && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex-shrink-0 text-emerald-500"
                  >
                    <CheckCircle2 size={16} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 元信息 */}
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                {typeLabels[note.note_type] || note.note_type}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={10} />
                {formatDistanceToNow(new Date(note.created_at * 1000), { addSuffix: true, locale: zhCN })}
              </span>
              {note.is_favorite && (
                <Star size={12} className="text-amber-500 fill-amber-500" />
              )}
              {note.use_count > 0 && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Hash size={10} />
                  {note.use_count}
                </span>
              )}
            </div>
          </div>

          {/* 悬停操作 */}
          <motion.div
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
            transition={{ duration: 0.15 }}
          >
            <motion.button
              onClick={handleFavorite}
              className={`p-2 rounded-lg transition-colors ${note.is_favorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Star size={16} className={note.is_favorite ? 'fill-amber-500' : ''} />
            </motion.button>
          </motion.div>
        </div>

        {/* 滑动提示 */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-transparent via-slate-300 to-transparent rounded-r-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: showActions ? 0 : (isHovered ? 0.4 : 0) }}
        />
      </motion.div>
    </motion.div>
  )
})

NoteItem.displayName = 'NoteItem'

export const Drawer: React.FC<DrawerProps> = ({ notes, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortMode] = useState<SortMode>('time')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { toggleFavorite, deleteNote, exportNotes } = useNotesStore()

  // 搜索过滤 - 带防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = [...notes]

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(note =>
          note.content.toLowerCase().includes(query) ||
          note.note_type.toLowerCase().includes(query) ||
          note.tags.some(tag => tag.toLowerCase().includes(query))
        )
      }

      if (selectedType) {
        filtered = filtered.filter(note => note.note_type === selectedType)
      }

      // 排序
      filtered.sort((a, b) => {
        switch (sortMode) {
          case 'time':
            return b.created_at - a.created_at
          case 'favorite':
            if (a.is_favorite === b.is_favorite) return b.created_at - a.created_at
            return a.is_favorite ? -1 : 1
          case 'type':
            if (a.note_type === b.note_type) return b.created_at - a.created_at
            return a.note_type.localeCompare(b.note_type)
          default:
            return 0
        }
      })

      setFilteredNotes(filtered)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery, notes, selectedType, sortMode])

  // 自动隐藏
  useEffect(() => {
    const handleMouseLeave = () => {
      hideTimerRef.current = setTimeout(() => {
        invoke('window_hide_drawer')
      }, 600)
    }

    const handleMouseEnter = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    const drawer = drawerRef.current
    if (drawer) {
      drawer.addEventListener('mouseleave', handleMouseLeave)
      drawer.addEventListener('mouseenter', handleMouseEnter)
    }

    // 键盘快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        invoke('window_hide_drawer')
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setViewMode(prev => prev === 'list' ? 'grid' : 'list')
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      if (drawer) {
        drawer.removeEventListener('mouseleave', handleMouseLeave)
        drawer.removeEventListener('mouseenter', handleMouseEnter)
      }
      window.removeEventListener('keydown', handleKeyDown)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const handleCopy = useCallback(async (note: Note) => {
    await invoke('clipboard_set_text', { content: note.content })
    setCopiedId(note.id)
    setTimeout(() => setCopiedId(null), 1500)

    await invoke('notes_update', {
      id: note.id,
      useCount: note.use_count + 1
    }).catch(() => { })

    setTimeout(() => invoke('window_hide_drawer'), 400)
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [onRefresh])

  const uniqueTypes = useMemo(() => 
    Array.from(new Set(notes.map(n => n.note_type))),
    [notes]
  )

  return (
    <div className="w-full h-full flex items-center justify-center p-3" style={{ background: 'transparent' }}>
      <motion.div
        ref={drawerRef}
        className="w-full max-w-[400px] h-[540px] bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-700/50"
        initial={{ opacity: 0, scale: 0.9, x: 60, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.9, x: 60, filter: 'blur(10px)' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          {/* 搜索栏 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索笔记... (/)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white dark:focus:bg-slate-800 border-0 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 视图切换 */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                title="列表视图 (Ctrl+V)"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                title="网格视图 (Ctrl+V)"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {/* 筛选栏 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${showFilters ? 'bg-primary/10 text-primary shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Filter size={12} />
              筛选
              <ChevronDown size={12} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all duration-200 ${selectedType === null ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                全部
              </button>
              {uniqueTypes.slice(0, 4).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(selectedType === type ? null : type)}
                  className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${selectedType === type ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <span>{typeIcons[type]}</span>
                  <span>{typeLabels[type] || type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 笔记列表 */}
        <div className={`flex-1 overflow-y-auto p-3 scrollbar-thin ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}`}>
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note, index) => (
              <NoteItem
                key={note.id}
                note={note}
                onCopy={handleCopy}
                onDelete={deleteNote}
                onToggleFavorite={toggleFavorite}
                isCopied={copiedId === note.id}
                viewMode={viewMode}
                index={index}
              />
            ))}
          </AnimatePresence>

          {/* 空状态 */}
          {filteredNotes.length === 0 && (
            <motion.div
              className="flex flex-col items-center justify-center h-56 text-slate-400 col-span-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <ClipboardList size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium text-base">
                {searchQuery ? '没有找到匹配的笔记' : '暂无笔记'}
              </p>
              <p className="text-sm mt-1 text-slate-400">复制内容时会自动保存到这里</p>
            </motion.div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{filteredNotes.length}</span>
              <span className="text-slate-400"> / {notes.length}</span>
            </span>
            <motion.button
              onClick={handleRefresh}
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 0.6, ease: 'linear' }}
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title="刷新"
            >
              <ExternalLink size={14} />
            </motion.button>
          </div>

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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
          >
            <Download size={14} />
            导出
          </button>
        </div>
      </motion.div>
    </div>
  )
}
