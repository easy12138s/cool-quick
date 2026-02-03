import React from 'react'
import { motion } from 'framer-motion'
import { 
  Download, 
  Upload, 
  Trash2, 
  Database,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import { useNotesStore } from '../../stores/useNotesStore'

export const QuickActions: React.FC = () => {
  const { exportNotes, importNotes } = useNotesStore()

  const handleExportJSON = async () => {
    const data = await exportNotes()
    if (data) {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coolquick-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        const result = await importNotes(text)
        alert(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
      }
    }
    input.click()
  }

  const actions = [
    {
      icon: Download,
      label: '导出 JSON',
      onClick: handleExportJSON,
      color: 'blue'
    },
    {
      icon: Upload,
      label: '导入数据',
      onClick: handleImport,
      color: 'green'
    },
    {
      icon: FileText,
      label: '导出 TXT',
      onClick: () => alert('功能开发中'),
      color: 'purple'
    },
    {
      icon: Database,
      label: '备份数据',
      onClick: () => alert('功能开发中'),
      color: 'amber'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        快捷操作
      </h3>
      
      <div className="space-y-2">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={action.onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              action.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100' :
              action.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100' :
              action.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100' :
              'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <action.icon size={18} />
            <span className="font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
