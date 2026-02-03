import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Search as SearchIcon } from 'lucide-react'
import { useNotesStore } from '../stores/useNotesStore'

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const { notes, getFilteredNotes } = useNotesStore()
  
  const filtered = query ? getFilteredNotes({ search: query }) : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <SearchIcon size={28} />
          全局搜索
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          在所有笔记中搜索内容、标签
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="输入关键词搜索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {query && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            找到 {filtered.length} 条结果
          </div>
          
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-12">
              未找到匹配的笔记
            </p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((note) => (
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
      )}
    </motion.div>
  )
}
