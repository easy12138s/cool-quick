import React from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useNotesStore } from '../stores/useNotesStore'

export const FavoritesPage: React.FC = () => {
  const { notes } = useNotesStore()
  const favorites = notes.filter(n => n.is_favorite)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Star size={28} className="text-yellow-500 fill-yellow-500" />
          收藏夹
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          共 {favorites.length} 条收藏的笔记
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {favorites.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            暂无收藏笔记，点击笔记上的星标来收藏
          </p>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {favorites.map((note) => (
              <div 
                key={note.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {note.content.slice(0, 150)}...
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    {note.note_type}
                  </span>
                  <span>
                    {new Date(note.created_at * 1000).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
