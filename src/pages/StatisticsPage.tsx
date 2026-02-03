import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
import { useNotesStore } from '../stores/useNotesStore'
import { Calendar, TrendingUp, Clock, Tag } from 'lucide-react'

interface DailyStat {
  date: string
  count: number
  hour: number
}

interface TypeStat {
  name: string
  value: number
  color: string
}

export const StatisticsPage: React.FC = () => {
  const { notes } = useNotesStore()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [typeStats, setTypeStats] = useState<TypeStat[]>([])
  const [hourlyStats, setHourlyStats] = useState<number[]>(Array(24).fill(0))

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
        count,
        hour: 0
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

  const totalNotes = notes.length
  const avgPerDay = dailyStats.length > 0
    ? (dailyStats.reduce((sum, s) => sum + s.count, 0) / dailyStats.length).toFixed(1)
    : '0'
  const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={28} />
            使用统计
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            分析您的剪贴板使用模式和习惯
          </p>
        </div>

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <Calendar size={24} />
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
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">平均每日</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgPerDay}</p>
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
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃时段</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{peakHour}:00</p>
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
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
              <Tag size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">类型数量</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{typeStats.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
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

      {/* Hourly Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
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
    </div>
  )
}
