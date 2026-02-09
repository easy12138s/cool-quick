import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ClipboardList, 
  Star, 
  Clock, 
  TrendingUp
} from 'lucide-react'
import { listen } from '@tauri-apps/api/event'
import { useNotesStore } from '../stores/useNotesStore'
import { StatCard } from '../components/dashboard/StatCard'
import { TrendChart } from '../components/dashboard/TrendChart'
import { TypeChart } from '../components/dashboard/TypeChart'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { QuickActions } from '../components/dashboard/QuickActions'

export const DashboardPage: React.FC = () => {
  const { notes, loadNotes } = useNotesStore()

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

  // Calculate stats
  const totalNotes = notes.length
  const favoriteCount = notes.filter(n => n.is_favorite).length
  const todayCount = notes.filter(n => {
    const date = new Date(n.created_at * 1000)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }).length
  const weekCount = notes.filter(n => {
    const date = new Date(n.created_at * 1000)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return date >= weekAgo
  }).length

  const stats: Array<{
    title: string
    value: number
    icon: typeof ClipboardList
    color: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
    trend?: string
    trendUp?: boolean
    subtitle?: string
  }> = [
    {
      title: '总笔记',
      value: totalNotes,
      icon: ClipboardList,
      color: 'blue',
      trend: '+12%',
      trendUp: true
    },
    {
      title: '今日新增',
      value: todayCount,
      icon: Clock,
      color: 'green',
      subtitle: '本周 ' + weekCount + ' 条'
    },
    {
      title: '收藏笔记',
      value: favoriteCount,
      icon: Star,
      color: 'yellow',
      subtitle: '占比 ' + (totalNotes > 0 ? Math.round(favoriteCount / totalNotes * 100) : 0) + '%'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          欢迎使用 CoolQuick
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          智能剪贴板管理工具 · {totalNotes} 条笔记已保存
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} delay={index * 0.1} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            使用趋势
          </h3>
          <TrendChart notes={notes} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            类型分布
          </h3>
          <TypeChart notes={notes} />
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            最近活动
          </h3>
          <RecentActivity notes={notes.slice(0, 5)} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <QuickActions />
        </motion.div>
      </div>
    </div>
  )
}
