import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, FileText } from 'lucide-react'
import { RichTextEditor, RichTextEditorRef } from '../Editor'
import type { Note } from '../../stores/useNotesStore'

interface EditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (content: string, title?: string) => void
  note?: Note | null
  mode?: 'create' | 'edit'
}

export const EditorModal: React.FC<EditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  note,
  mode = 'create',
}) => {
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<RichTextEditorRef>(null)

  // 初始化编辑器内容
  useEffect(() => {
    if (isOpen && note) {
      // 编辑模式
      setTitle(note.title || '')
      // 延迟设置内容，等待编辑器初始化
      setTimeout(() => {
        editorRef.current?.setContent(note.content)
      }, 100)
    } else if (isOpen) {
      // 新建模式
      setTitle('')
      setTimeout(() => {
        editorRef.current?.clear()
      }, 100)
    }
  }, [isOpen, note])

  // 处理保存
  const handleSave = async () => {
    const content = editorRef.current?.getHTML() || ''
    const textContent = editorRef.current?.getText() || ''

    if (!textContent.trim()) {
      return
    }

    setIsSaving(true)
    await onSave(content, title)
    setIsSaving(false)
    onClose()
  }

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <FileText className="text-primary-500" size={24} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {mode === 'create' ? '新建笔记' : '编辑笔记'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Title Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="笔记标题（可选）"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2 text-lg font-medium border-b-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-primary-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>

              {/* Rich Text Editor */}
              <RichTextEditor
                ref={editorRef}
                placeholder="开始写作..."
                onChange={html => {
                  // 实时保存或自动保存可以在这里实现
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="text-sm text-gray-500">
                <span className="hidden sm:inline">快捷键: </span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border text-xs">
                  Ctrl+S
                </kbd>
                <span className="mx-1">保存</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border text-xs">
                  ESC
                </kbd>
                <span className="mx-1">关闭</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {mode === 'create' ? '创建笔记' : '保存修改'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
