import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Note } from '../../stores/useNotesStore'
import { format, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TrendChartProps {
  notes: Note[]
}

export const TrendChart: React.FC<TrendChartProps> = ({ notes }) => {
  // Generate data for last 30 days
  const data = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i)
    const dateStr = format(date, 'MM-dd')
    
    const count = notes.filter(note => {
      const noteDate = new Date(note.created_at * 1000)
      return format(noteDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    }).length
    
    return {
      date: dateStr,
      count
    }
  })

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
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
            stroke="#4f46e5" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
