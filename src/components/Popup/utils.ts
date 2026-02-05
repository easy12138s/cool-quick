// 内容类型配置
export interface ContentTypeConfig {
  icon: string
  label: string
  gradient: string
  shadow: string
  textColor: string
  bgColor: string
}

export const typeConfig: Record<string, ContentTypeConfig> = {
  phone: {
    icon: '📱',
    label: '手机号',
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    shadow: 'shadow-blue-500/30',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  email: {
    icon: '✉️',
    label: '邮箱',
    gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/30',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  url: {
    icon: '🔗',
    label: '网址',
    gradient: 'from-violet-500 via-violet-600 to-purple-600',
    shadow: 'shadow-violet-500/30',
    textColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  code: {
    icon: '💻',
    label: '代码',
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    shadow: 'shadow-amber-500/30',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  password: {
    icon: '🔐',
    label: '密码',
    gradient: 'from-rose-500 via-rose-600 to-pink-600',
    shadow: 'shadow-rose-500/30',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  text: {
    icon: '📝',
    label: '文本',
    gradient: 'from-slate-500 via-slate-600 to-gray-600',
    shadow: 'shadow-slate-500/30',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
  },
} as const

// 内容处理工具函数
export const maskPassword = (content: string): string => {
  const length = Math.min(content.length, 20)
  return '•'.repeat(length)
}

export const truncateContent = (content: string, maxLength: number = 800): string => {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

// 检测内容类型
export const detectContentType = (content: string): string => {
  if (/^1[3-9]\d{9}$/.test(content)) return 'phone'
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(content)) return 'email'
  if (/^https?:\/\//.test(content)) return 'url'
  if (
    content.includes('{') ||
    content.includes('}') ||
    content.includes('function') ||
    content.includes('const')
  ) {
    return 'code'
  }
  if (content.length < 20 && /[a-zA-Z0-9!@#$%^&*]{8,}/.test(content)) {
    return 'password'
  }
  return 'text'
}

// 格式化代码预览
export const formatCodePreview = (content: string): string => {
  // 简单的代码格式化：保留缩进，限制行数
  const lines = content.split('\n')
  if (lines.length > 10) {
    return lines.slice(0, 10).join('\n') + '\n...'
  }
  return content
}
