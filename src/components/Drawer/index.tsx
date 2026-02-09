import { useState, useCallback, useRef, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { Search, X, CheckSquare, Square, Trash2 } from 'lucide-react'
import { NoteItem } from './NoteItem'
import { useNoteFilter } from './useNoteFilter'
import { useDrawerAutoHide } from './useDrawerAutoHide'
import { useNotesStore } from '../../stores/useNotesStore'
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
  text: '📝',
}

export const Drawer: React.FC<DrawerProps> = ({ notes, onRefresh }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    filteredNotes,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    uniqueTypes,
  } = useNoteFilter({ notes })

  const { handleMouseEnter, handleMouseLeave, hideDrawer } = useDrawerAutoHide({
    enabled: true,
    delay: 0,
  })

  const { toggleFavorite, deleteNote } = useNotesStore()

  // 监听抽屉显示事件，重置状态
  useEffect(() => {
    const unlisten = listen('window-shown', (event) => {
      if ('drawer' in event.payload && (event.payload as any).drawer === true) {
        // 重置状态
        setSelectedIds(new Set())
        setSearchQuery('')
        setSelectedType(null)
      }
    })

    return () => {
      unlisten.then(f => f())
    }
  }, [])

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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSelectAll, handleBatchDelete, selectedIds.size])

  const hasSelection = selectedIds.size > 0

  return (
    <div
      className="w-full h-full bg-white dark:bg-slate-900 flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
          {/* 批量操作 */}
          <div className="flex items-center gap-2">
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
    <div className="flex-1 overflow-y-auto scrollbar-thin">
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
            index={index}
          />
        ))}

        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm">{searchQuery ? '未找到匹配的笔记' : '暂无笔记'}</p>
            <p className="text-xs text-slate-400 mt-1">复制内容会自动保存</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="text-[10px] text-slate-400">
          {filteredNotes.length} / {notes.length} 条笔记
        </div>
      </div>
    </div>
  )
}
