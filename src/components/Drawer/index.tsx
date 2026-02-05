import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Download,
  ExternalLink,
  Trash2,
  CheckSquare,
  Square,
  Clock,
  ArrowUpDown,
  Plus,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { NoteItem } from './NoteItem'
import { useNoteFilter } from './useNoteFilter'
import { useDrawerAutoHide } from './useDrawerAutoHide'
import { useNotesStore } from '../../stores/useNotesStore'
import { EditorModal } from '../Editor/EditorModal'
import type { Note } from '../../stores/useNotesStore'

interface DrawerProps {
  notes: Note[]
  onRefresh: () => void
}

const typeIcons: Record<string, string> = {
  phone: '📱',
  email: '📧',
  url: '🔗',
  code: '💻',
  password: '🔐',
  text: '📝',
}

export const Drawer: React.FC<DrawerProps> = ({ notes, onRefresh }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    filteredNotes,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    sortMode,
    setSortMode,
    uniqueTypes,
  } = useNoteFilter({ notes })

  const { handleMouseEnter, handleMouseLeave, hideDrawer } = useDrawerAutoHide({
    enabled: true,
    delay: 0, // 鼠标离开立即隐藏
  })

  const { toggleFavorite, deleteNote, exportNotes, addNote, updateNote } = useNotesStore()

  // 处理复制
  const handleCopy = useCallback(
    async (note: Note) => {
      await invoke('clipboard_set_text', { content: note.content })
      setCopiedId(note.id)
      setTimeout(() => setCopiedId(null), 1500)

      // 更新使用次数
      await invoke('notes_update', {
        id: note.id,
        useCount: note.use_count + 1,
      }).catch(() => {})

      // 延迟隐藏抽屉
      setTimeout(() => hideDrawer(), 500)
    },
    [hideDrawer]
  )

  // 处理选择
  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // 全选
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredNotes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotes.map(n => n.id)))
    }
  }, [filteredNotes, selectedIds.size])

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return

    for (const id of selectedIds) {
      await deleteNote(id)
    }
    setSelectedIds(new Set())
  }, [selectedIds, deleteNote])

  // 刷新
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 300)
  }, [onRefresh])

  // 导出
  const handleExport = useCallback(async () => {
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
  }, [exportNotes])

  // 处理编辑笔记
  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note)
    setEditorMode('edit')
    setIsEditorOpen(true)
  }, [])

  // 处理新建笔记
  const handleCreateNote = useCallback(() => {
    setEditingNote(null)
    setEditorMode('create')
    setIsEditorOpen(true)
  }, [])

  // 处理保存笔记
  const handleSaveNote = useCallback(
    async (content: string, title?: string) => {
      if (editorMode === 'create') {
        // 从内容中提取纯文本作为类型检测
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = content
        const textContent = tempDiv.textContent || tempDiv.innerText || ''

        await addNote({
          content,
          note_type: detectContentType(textContent),
          title: title || '',
          source_app: 'CoolQuick',
          is_favorite: false,
          tags: [],
        })
      } else if (editingNote) {
        await updateNote(editingNote.id, {
          content,
          title: title || editingNote.title,
        })
      }
      await onRefresh()
    },
    [editorMode, editingNote, addNote, updateNote, onRefresh]
  )

  // 检测内容类型
  const detectContentType = (content: string): string => {
    if (/^1[3-9]\d{9}$/.test(content)) return 'phone'
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(content)) return 'email'
    if (/^https?:\/\//.test(content)) return 'url'
    if (content.includes('{') || content.includes('}') || content.includes('function'))
      return 'code'
    return 'text'
  }

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A 全选
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSelectAll()
      }
      // Delete 删除选中
      if (e.key === 'Delete' && selectedIds.size > 0) {
        e.preventDefault()
        handleBatchDelete()
      }
      // / 聚焦搜索
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Ctrl/Cmd + N 新建笔记
      if (e.key === 'n' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        handleCreateNote()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSelectAll, handleBatchDelete, selectedIds.size, handleCreateNote])

  const hasSelection = selectedIds.size > 0

  return (
    <motion.div
      className="w-full h-full bg-white dark:bg-slate-900 flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
      initial={{ opacity: 0, x: 30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {/* 搜索栏 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索笔记... (/)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          {/* 批量操作和新建 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-white bg-primary hover:bg-primary-600 rounded-lg transition-colors"
              title="新建笔记 (Ctrl+N)"
            >
              <Plus size={14} />
              <span>新建</span>
            </button>
            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title="全选 (Ctrl+A)"
            >
              {hasSelection ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{hasSelection ? `${selectedIds.size} 条` : filteredNotes.length} 条</span>
            </button>

            {hasSelection && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleBatchDelete}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={12} />
                删除
              </motion.button>
            )}
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortMode('time')}
              className={`p-1.5 rounded-lg transition-colors ${
                sortMode === 'time'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="按时间排序"
            >
              <Clock size={14} />
            </button>
            <button
              onClick={() => setSortMode('favorite')}
              className={`p-1.5 rounded-lg transition-colors ${
                sortMode === 'favorite'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="按收藏排序"
            >
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap transition-colors ${
              selectedType === null
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部
          </button>
          {uniqueTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
              className={`px-2 py-1 text-[11px] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                selectedType === type
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{typeIcons[type]}</span>
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filteredNotes.map((note, index) => (
            <NoteItem
              key={note.id}
              note={note}
              isCopied={copiedId === note.id}
              isSelected={selectedIds.has(note.id)}
              onCopy={handleCopy}
              onDelete={deleteNote}
              onToggleFavorite={toggleFavorite}
              onSelect={handleSelect}
              onEdit={handleEditNote}
              index={index}
            />
          ))}
        </AnimatePresence>

        {filteredNotes.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-32 text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm">{searchQuery ? '未找到匹配的笔记' : '暂无笔记'}</p>
            <p className="text-xs text-slate-400 mt-1">复制内容会自动保存</p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors"
            title="刷新"
          >
            <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }} transition={{ duration: 0.5 }}>
              <ExternalLink size={14} />
            </motion.div>
          </button>
          <button
            onClick={handleExport}
            className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors"
            title="导出"
          >
            <Download size={14} />
          </button>
        </div>

        <div className="text-[10px] text-slate-400">
          {filteredNotes.length} / {notes.length}
        </div>
      </div>

      {/* 编辑器弹窗 */}
      <EditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveNote}
        note={editingNote}
        mode={editorMode}
      />
    </motion.div>
  )
}
