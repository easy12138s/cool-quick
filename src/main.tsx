import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Debug: 检查 DOM 是否加载
console.log('main.tsx loaded')
console.log('root element:', document.getElementById('root'))

const root = document.getElementById('root')
if (!root) {
  console.error('Root element not found!')
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('React app rendered')
}
