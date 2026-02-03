import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNotesStore } from '../stores/useNotesStore'
import { Archive, RotateCcw } from 'lucide-react'

export const ArchivePage: React.FC = () => {
  const { archivedNotes, loadArchivedNotes, unarchiveNote } = useNotesStore()

  useEffect(() => {
    loadArchivedNotes()
  }, [loadArchivedNotes])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Archive size={28} />
            归档箱
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            已归档 {archivedNotes.length} 条笔记
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {archivedNotes.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            暂无归档笔记
          </p>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {archivedNotes.map((note) => (
              <div 
                key={note.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {note.content.slice(0, 100)}...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(note.created_at * 1000).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={() => unarchiveNote(note.id)}
                  className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="恢复"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
