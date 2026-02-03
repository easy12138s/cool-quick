import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNotesStore } from '../stores/useNotesStore'
import { ClipboardList } from 'lucide-react'

export const NotesPage: React.FC = () => {
  const { notes, loadNotes } = useNotesStore()

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList size={28} />
            全部笔记
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            共 {notes.length} 条笔记
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            新建笔记
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 text-center py-12">
          笔记列表功能开发中... 这里将显示完整的笔记管理表格
        </p>
      </div>
    </motion.div>
  )
}
