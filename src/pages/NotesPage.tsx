import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotesStore } from '../stores/useNotesStore'
import type { Note } from '../types'
import {
  ClipboardList,
  Search,
  Filter,
  Star,
  Trash2,
  Archive,
  ExternalLink,
  Copy,
  Clock,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { EditorModal } from '../components/Editor/EditorModal'

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

const typeColors: Record<string, string> = {
  phone: 'bg-blue-100 text-blue-700 border-blue-200',
  email: 'bg-green-100 text-green-700 border-green-200',
  url: 'bg-purple-100 text-purple-700 border-purple-200',
  code: 'bg-amber-100 text-amber-700 border-amber-200',
  password: 'bg-rose-100 text-rose-700 border-rose-200',
  text: 'bg-gray-100 text-gray-700 border-gray-200',
}

// 提取纯文本内容（去除 HTML 标签）
const stripHtml = (html: string): string => {
  if (!html) return ''
  // 创建一个临时的 div 来解析 HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export const NotesPage: React.FC = () => {
  const { notes, loadNotes, deleteNote, archiveNote, toggleFavorite, exportNotes, importNotes } =
    useNotesStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const itemsPerPage = 10

  useEffect(() => {
    loadNotes()

    // 监听笔记更新事件，实时同步数据
    const unlisten = listen('notes-updated', () => {
      loadNotes()
    })

    return () => {
      unlisten.then(f => f())
    }
  }, [loadNotes])

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      !searchQuery ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(note.note_type)
    const matchesFavorite = !showFavoritesOnly || note.is_favorite

    return matchesSearch && matchesType && matchesFavorite
  })

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage)
  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Get unique types
  const uniqueTypes = Array.from(new Set(notes.map(n => n.note_type)))

  const handleCopy = async (note: Note) => {
    await invoke('clipboard_set_text', { content: note.content })
    setCopiedId(note.id)
    setTimeout(() => setCopiedId(null), 2000)
    showNotification('success', '已复制到剪贴板')
  }

  const handleDelete = async (id: string) => {
    await deleteNote(id)
    showNotification('success', '笔记已删除')
    if (selectedNote?.id === id) {
      setIsDetailOpen(false)
      setSelectedNote(null)
    }
  }

  const handleArchive = async (id: string) => {
    await archiveNote(id)
    showNotification('success', '笔记已归档')
    if (selectedNote?.id === id) {
      setIsDetailOpen(false)
      setSelectedNote(null)
    }
  }

  const handleToggleFavorite = async (id: string, currentState: boolean) => {
    await toggleFavorite(id, currentState)
    showNotification('success', currentState ? '已取消收藏' : '已收藏')
  }

  const handleExport = async () => {
    const data = await exportNotes()
    if (data) {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
      URL.revokeObjectURL(url)
      showNotification('success', '笔记已导出')
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const result = await importNotes(text)
      showNotification('success', `导入完成: ${result.success} 成功, ${result.failed} 失败`)
    } catch (error) {
      showNotification('error', '导入失败')
    } finally {
      event.target.value = ''
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleCreateNote = () => {
    setIsEditorOpen(true)
  }

  const handleSaveNote = async (content: string, title?: string) => {
    // 从内容中提取纯文本作为类型检测
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const textContent = tempDiv.textContent || tempDiv.innerText || ''

    // 检测内容类型
    let noteType = 'text'
    if (/^1[3-9]\d{9}$/.test(textContent)) {
      noteType = 'phone'
    } else if (/^[\w.-]+@[\w.-]+\.\w+$/.test(textContent)) {
      noteType = 'email'
    } else if (/^https?:\/\//.test(textContent)) {
      noteType = 'url'
    } else if (
      textContent.includes('{') ||
      textContent.includes('}') ||
      textContent.includes('function')
    ) {
      noteType = 'code'
    }

    await invoke('notes_create', {
      request: {
        content,
        noteType,
        tags: [],
        sourceApp: 'CoolQuick',
        title: title || undefined,
      },
    })

    await loadNotes()
    showNotification('success', '笔记创建成功')
  }

  const openDetail = (note: Note) => {
    setSelectedNote(note)
    setIsDetailOpen(true)
  }

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]))
    setCurrentPage(1)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList size={28} className="text-indigo-600" />
            全部笔记
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">共 {filteredNotes.length} 条笔记</p>
        </div>

        <div className="flex gap-3">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center gap-2"
          >
            <Upload size={18} />
            导入
          </label>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download size={18} />
            导出
          </button>
          <button
            onClick={handleCreateNote}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus size={18} />
            新建笔记
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索笔记内容或标签..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Type Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Filter size={14} />
            筛选:
          </span>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors ${
              showFavoritesOnly
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star size={14} className={showFavoritesOnly ? 'fill-yellow-500' : ''} />
            收藏
          </button>

          {uniqueTypes.map(type => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors ${
                selectedTypes.includes(type)
                  ? typeColors[type] || 'bg-gray-100 text-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{typeIcons[type]}</span>
              {typeLabels[type] || type}
            </button>
          ))}

          {(selectedTypes.length > 0 || showFavoritesOnly || searchQuery) && (
            <button
              onClick={() => {
                setSelectedTypes([])
                setShowFavoritesOnly(false)
                setSearchQuery('')
                setCurrentPage(1)
              }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={14} />
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {paginatedNotes.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">暂无笔记</p>
            <p className="text-gray-400 text-sm mt-1">复制内容时会自动保存到这里</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${
                        typeColors[note.note_type] || 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {typeIcons[note.note_type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-indigo-600"
                          onClick={() => openDetail(note)}
                        >
                          {stripHtml(note.content).slice(0, 100)}
                          {stripHtml(note.content).length > 100 ? '...' : ''}
                        </p>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleCopy(note)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="复制"
                          >
                            {copiedId === note.id ? (
                              <CheckCircle2 size={18} className="text-green-500" />
                            ) : (
                              <Copy size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleFavorite(note.id, note.is_favorite)}
                            className={`p-2 rounded-lg transition-colors ${
                              note.is_favorite
                                ? 'text-yellow-500 bg-yellow-50'
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                            }`}
                            title={note.is_favorite ? '取消收藏' : '收藏'}
                          >
                            <Star size={18} className={note.is_favorite ? 'fill-yellow-500' : ''} />
                          </button>
                          <button
                            onClick={() => openDetail(note)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <ExternalLink size={18} />
                          </button>
                          <button
                            onClick={() => handleArchive(note.id)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="归档"
                          >
                            <Archive size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span
                          className={`px-2 py-0.5 rounded text-xs border ${
                            typeColors[note.note_type] ||
                            'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {typeLabels[note.note_type] || note.note_type}
                        </span>

                        {note.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag size={12} />
                            {note.tags.join(', ')}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDistanceToNow(new Date(note.created_at * 1000), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>

                        {note.use_count > 0 && (
                          <span className="text-indigo-600">使用 {note.use_count} 次</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  第 {currentPage} / {totalPages} 页，共 {filteredNotes.length} 条
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsDetailOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{typeIcons[selectedNote.note_type]}</span>
                  <span
                    className={`px-2 py-1 rounded text-sm border ${
                      typeColors[selectedNote.note_type] ||
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {typeLabels[selectedNote.note_type] || selectedNote.note_type}
                  </span>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                  <div
                    className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all text-sm prose prose-sm max-w-none dark:prose-invert select-text cursor-text"
                    dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                  />
                </div>

                <div className="space-y-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      创建时间:{' '}
                      {format(new Date(selectedNote.created_at * 1000), 'yyyy-MM-dd HH:mm:ss', {
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      更新时间:{' '}
                      {format(new Date(selectedNote.updated_at * 1000), 'yyyy-MM-dd HH:mm:ss', {
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                  {selectedNote.source_app && (
                    <div className="flex items-center gap-2">
                      <ExternalLink size={16} />
                      <span>来源: {selectedNote.source_app}</span>
                    </div>
                  )}
                  {selectedNote.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag size={16} />
                      <span>标签: {selectedNote.tags.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} />
                    <span>使用次数: {selectedNote.use_count}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => handleCopy(selectedNote)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Copy size={18} />
                  复制内容
                </button>
                <button
                  onClick={() => handleToggleFavorite(selectedNote.id, selectedNote.is_favorite)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    selectedNote.is_favorite
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Star size={18} className={selectedNote.is_favorite ? 'fill-yellow-500' : ''} />
                  {selectedNote.is_favorite ? '取消收藏' : '收藏'}
                </button>
                <button
                  onClick={() => handleArchive(selectedNote.id)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <Archive size={18} />
                  归档
                </button>
                <button
                  onClick={() => handleDelete(selectedNote.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <EditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveNote}
        mode="create"
      />
    </motion.div>
  )
}
