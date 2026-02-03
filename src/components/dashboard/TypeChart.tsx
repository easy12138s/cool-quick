import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Note } from '../../stores/useNotesStore'

interface TypeChartProps {
  notes: Note[]
}

const typeColors: Record<string, string> = {
  phone: '#3b82f6',    // blue
  email: '#10b981',    // green
  url: '#8b5cf6',      // purple
  code: '#f59e0b',     // amber
  password: '#ef4444', // red
  text: '#6b7280'      // gray
}

const typeNames: Record<string, string> = {
  phone: '手机号',
  email: '邮箱',
  url: '网址',
  code: '代码',
  password: '密码',
  text: '文本'
}

export const TypeChart: React.FC<TypeChartProps> = ({ notes }) => {
  // Count by type
  const typeCounts: Record<string, number> = {}
  notes.forEach(note => {
    typeCounts[note.note_type] = (typeCounts[note.note_type] || 0) + 1
  })

  const data = Object.entries(typeCounts).map(([type, count]) => ({
    name: typeNames[type] || type,
    value: count,
    color: typeColors[type] || '#6b7280'
  }))

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        暂无数据
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
