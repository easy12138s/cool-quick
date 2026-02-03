import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Check, X, Play, Save } from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'

interface CustomRule {
  id: string
  name: string
  pattern: string
  action_type: 'popup' | 'silent' | 'ignore'
  is_enabled: boolean
  priority: number
}

export const RulesEditor: React.FC = () => {
  const [rules, setRules] = useState<CustomRule[]>([
    {
      id: '1',
      name: 'IP地址识别',
      pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$',
      action_type: 'popup',
      is_enabled: true,
      priority: 1
    }
  ])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    name: '',
    pattern: '',
    action_type: 'popup',
    is_enabled: true,
    priority: 1
  })
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddRule = () => {
    if (newRule.name && newRule.pattern) {
      const rule: CustomRule = {
        id: Date.now().toString(),
        name: newRule.name,
        pattern: newRule.pattern,
        action_type: newRule.action_type || 'popup',
        is_enabled: newRule.is_enabled ?? true,
        priority: newRule.priority || 1
      }
      setRules([...rules, rule])
      setNewRule({ name: '', pattern: '', action_type: 'popup', is_enabled: true, priority: 1 })
      setShowAddForm(false)
    }
  }

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id))
  }

  const handleToggleRule = (id: string) => {
    setRules(rules.map(r => 
      r.id === id ? { ...r, is_enabled: !r.is_enabled } : r
    ))
  }

  const handleUpdateRule = (id: string, updates: Partial<CustomRule>) => {
    setRules(rules.map(r => 
      r.id === id ? { ...r, ...updates } : r
    ))
  }

  const handleTestPattern = () => {
    if (!testText) {
      setTestResult('请输入测试文本')
      return
    }

    let matched = false
    let matchedRule: CustomRule | null = null

    for (const rule of rules.filter(r => r.is_enabled)) {
      try {
        const regex = new RegExp(rule.pattern)
        if (regex.test(testText)) {
          matched = true
          matchedRule = rule
          break
        }
      } catch (e) {
        continue
      }
    }

    if (matched && matchedRule) {
      setTestResult(`✅ 匹配成功！规则 "${matchedRule.name}" (${matchedRule.action_type})`)
    } else {
      setTestResult('❌ 未匹配任何规则')
    }
  }

  const saveRules = async () => {
    try {
      await invoke('rules_save', { rules })
      alert('规则已保存！')
    } catch (e) {
      console.error('Failed to save rules:', e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">自定义识别规则</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            创建正则表达式规则来自定义识别和分类内容
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus size={18} />
            添加规则
          </button>
          <button
            onClick={saveRules}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save size={18} />
            保存
          </button>
        </div>
      </div>

      {/* Test Area */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          测试规则
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="输入文本测试规则匹配..."
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
          <button
            onClick={handleTestPattern}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Play size={16} />
            测试
          </button>
        </div>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-sm"
          >
            {testResult}
          </motion.div>
        )}
      </div>

      {/* Add Rule Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              新规则
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="规则名称 (如: IP地址识别)"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
              <input
                type="text"
                value={newRule.pattern}
                onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                placeholder="正则表达式 (如: ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$)"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={newRule.action_type}
                  onChange={(e) => setNewRule({ ...newRule, action_type: e.target.value as any })}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="popup">弹窗提示</option>
                  <option value="silent">静默保存</option>
                  <option value="ignore">忽略</option>
                </select>
                <input
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                  placeholder="优先级"
                  className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddRule}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  添加
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules List */}
      <div className="space-y-2">
        {rules.map((rule) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-xl border ${
              rule.is_enabled 
                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
            }`}
          >
            {editingId === rule.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
                <input
                  type="text"
                  value={rule.pattern}
                  onChange={(e) => handleUpdateRule(rule.id, { pattern: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm"
                  >
                    <Check size={14} />
                    完成
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{rule.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      rule.action_type === 'popup' ? 'bg-blue-100 text-blue-700' :
                      rule.action_type === 'silent' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rule.action_type}
                    </span>
                    <span className="text-xs text-gray-500">优先级: {rule.priority}</span>
                  </div>
                  <code className="text-xs text-gray-500 dark:text-gray-400 mt-1 block font-mono">
                    {rule.pattern}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`p-2 rounded-lg ${
                      rule.is_enabled 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={rule.is_enabled ? '禁用' : '启用'}
                  >
                    {rule.is_enabled ? <Check size={16} /> : <X size={16} />}
                  </button>
                  <button
                    onClick={() => setEditingId(rule.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="编辑"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无自定义规则，点击"添加规则"创建
        </div>
      )}
    </div>
  )
}
