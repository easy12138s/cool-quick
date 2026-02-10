import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Star, Clock, TrendingUp, Calendar, Tag } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { listen } from '@tauri-apps/api/event'
import { useNotesStore } from '../stores/useNotesStore'
import { StatCard } from '../components/dashboard/StatCard'
import { TypeChart } from '../components/dashboard/TypeChart'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { QuickActions } from '../components/dashboard/QuickActions'

interface DailyStat {
  date: string
  count: number
}

interface TypeStat {
  name: string
  value: number
  color: string
}

export const DashboardPage: React.FC = () => {
  const { notes, loadNotes } = useNotesStore()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [typeStats, setTypeStats] = useState<TypeStat[]>([])
  const [hourlyStats, setHourlyStats] = useState<number[]>(Array(24).fill(0))

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

  useEffect(() => {
    calculateStats()
  }, [notes, timeRange])

  const calculateStats = () => {
    // Calculate daily stats
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365
    const stats: DailyStat[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const count = notes.filter(note => {
        const noteDate = new Date(note.created_at * 1000).toISOString().split('T')[0]
        return noteDate === dateStr
      }).length

      stats.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count
      })
    }
    setDailyStats(stats)

    // Calculate type stats
    const typeCounts: Record<string, number> = {}
    notes.forEach(note => {
      typeCounts[note.note_type] = (typeCounts[note.note_type] || 0) + 1
    })

    const colors: Record<string, string> = {
      phone: '#3b82f6',
      email: '#10b981',
      url: '#8b5cf6',
      code: '#f59e0b',
      password: '#ef4444',
      text: '#6b7280'
    }

    const typeData = Object.entries(typeCounts).map(([name, value]) => ({
      name: getTypeLabel(name),
      value,
      color: colors[name] || '#6b7280'
    }))
    setTypeStats(typeData)

    // Calculate hourly stats
    const hourly = Array(24).fill(0)
    notes.forEach(note => {
      const hour = new Date(note.created_at * 1000).getHours()
      hourly[hour]++
    })
    setHourlyStats(hourly)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      phone: '手机号',
      email: '邮箱',
      url: '网址',
      code: '代码',
      password: '密码',
      text: '文本'
    }
    return labels[type] || type
  }

  // Calculate basic stats
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
  const avgPerDay = dailyStats.length > 0
    ? (dailyStats.reduce((sum, s) => sum + s.count, 0) / dailyStats.length).toFixed(1)
    : '0'
  const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats))

  return (
    <div className="space-y-6 pb-8">
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

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">总笔记数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalNotes}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日新增</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayCount}</p>
              <p className="text-xs text-gray-400">本周 {weekCount} 条</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
              <Star size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">收藏笔记</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{favoriteCount}</p>
              <p className="text-xs text-gray-400">占比 {totalNotes > 0 ? Math.round(favoriteCount / totalNotes * 100) : 0}%</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">平均每日</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgPerDay}</p>
              <p className="text-xs text-gray-400">活跃时段 {peakHour}:00</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart size={20} />
          详细统计
        </h2>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {range === 'week' ? '本周' : range === 'month' ? '本月' : '全年'}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            每日新增趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            内容类型分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Hourly Activity & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            24小时活跃分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={hourlyStats.map((count, hour) => ({ hour: `${hour}:00`, count }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={2} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity & Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              最近活动
            </h3>
            <RecentActivity notes={notes.slice(0, 5)} />
          </div>
          <QuickActions />
        </motion.div>
      </div>

      {/* Bottom Row - Type Stats Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Tag size={20} />
          类型统计详情
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {typeStats.map((type, index) => (
            <div key={type.name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{type.name}</p>
                <p className="text-xs text-gray-500">{type.value} 条</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
