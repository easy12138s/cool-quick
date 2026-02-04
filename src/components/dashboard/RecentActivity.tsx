import React from 'react'
import { motion } from 'framer-motion'
import { Note } from '../../stores/useNotesStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { 
  Star, 
  Archive,
  Smartphone,
  Mail,
  Link,
  Code,
  Lock,
  FileText
} from 'lucide-react'

interface RecentActivityProps {
  notes: Note[]
}

const typeIcons: Record<string, React.ReactNode> = {
  phone: <Smartphone size={16} />,
  email: <Mail size={16} />,
  url: <Link size={16} />,
  code: <Code size={16} />,
  password: <Lock size={16} />,
  text: <FileText size={16} />
}

const typeColors: Record<string, string> = {
  phone: 'bg-blue-100 text-blue-600',
  email: 'bg-green-100 text-green-600',
  url: 'bg-purple-100 text-purple-600',
  code: 'bg-amber-100 text-amber-600',
  password: 'bg-rose-100 text-rose-600',
  text: 'bg-gray-100 text-gray-600'
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ notes }) => {
  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无最近活动
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notes.map((note, index) => (
        <motion.div
          key={note.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className={`p-2 rounded-lg ${typeColors[note.note_type]}`}>
            {typeIcons[note.note_type]}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {note.content.length > 50 ? note.content.slice(0, 50) + '...' : note.content}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(note.created_at * 1000), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            {note.is_favorite && (
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
            )}
            {note.is_archived && (
              <Archive size={14} className="text-gray-400" />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
