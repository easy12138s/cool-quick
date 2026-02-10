import React, { useEffect } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { listen, emit } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { MainLayout } from './components/layout/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { NotesPage } from './pages/NotesPage'
import { ArchivePage } from './pages/ArchivePage'
import { SettingsPage } from './pages/SettingsPage'
import { SearchPage } from './pages/SearchPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { FloatingWindow } from './components/FloatingWindow/index'
import { Drawer } from './components/Drawer'
import { Popup } from './components/Popup'
import { setupClipboardListener } from './stores/useNotesStore'
import { setupThemeListener } from './stores/useConfigStore'
import { useNotesStore } from './stores/useNotesStore'
import { useConfigStore } from './stores/useConfigStore'
import { usePopupStore } from './stores/usePopupStore'

interface TauriEvent {
  payload: {
    content: string
    type: string
    sourceApp?: string
  }
}

// Window type detection from URL
const getWindowType = (): string => {
  const params = new URLSearchParams(window.location.search)
  return params.get('window') || 'main'
}

// Apply transparent background for special windows
const applyTransparentBackground = (windowType: string) => {
  if (windowType !== 'main') {
    document.body.classList.add('transparent-window')
  }
}

// Router for main window - use HashRouter for Tauri desktop app
const mainRouter = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'archive', element: <ArchivePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'statistics', element: <StatisticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

// Floating window component
const FloatingWindowWrapper: React.FC = () => {
  const { notes } = useNotesStore()

  const handleMouseEnter = () => {
    invoke('window_show_drawer')
  }

  return <FloatingWindow onMouseEnter={handleMouseEnter} noteCount={notes.length} />
}

// Drawer window component
const DrawerWindowWrapper: React.FC = () => {
  const { notes, loadNotes } = useNotesStore()

  useEffect(() => {
    loadNotes()

    // 监听笔记更新事件
    const unlisten = listen('notes-updated', () => {
      loadNotes()
    })

    return () => {
      unlisten.then(f => f())
    }
  }, [loadNotes])

  return <Drawer notes={notes} onRefresh={loadNotes} />
}

// Popup window component
const PopupWindowWrapper: React.FC = () => {
  const { popupData, hidePopup } = usePopupStore()
  const { config } = useConfigStore()
  const { loadNotes } = useNotesStore()

  const handleSave = async () => {
    console.log('handleSave called, popupData:', popupData)
    if (popupData) {
      try {
        const id = await invoke('notes_create', {
          request: {
            content: popupData.content,
            noteType: popupData.type,
            tags: [],
            sourceApp: popupData.sourceApp || '',
            title: undefined,
          },
        })
        console.log('Note saved successfully, ID:', id)
      } catch (error) {
        console.error('Failed to save note:', error)
      }
    }
    hidePopup()
    await loadNotes()
    // 触发全局事件通知所有窗口刷新
    await emit('notes-updated')
  }

  const handleDismiss = async () => {
    hidePopup()
  }

  if (!popupData) return null

  return (
    <Popup
      content={popupData.content}
      contentType={popupData.type}
      sourceApp={popupData.sourceApp}
      autoCloseSeconds={config?.popup_auto_close_seconds || 3}
      onSave={handleSave}
      onDismiss={handleDismiss}
    />
  )
}

function App() {
  const windowType = getWindowType()
  const { loadConfig } = useConfigStore()
  const { showPopup, setPopupData } = usePopupStore()

  useEffect(() => {
    // Apply transparent background for special windows
    applyTransparentBackground(windowType)
    
    // Set window type attribute on body for CSS targeting
    document.body.setAttribute('data-window', windowType)

    loadConfig()
    setupClipboardListener()
    setupThemeListener()

    const unlistenClipboard = listen('clipboard-change', (event: TauriEvent) => {
      setPopupData(event.payload)
      showPopup()
    })

    return () => {
      unlistenClipboard.then(f => f())
    }
  }, [loadConfig, setPopupData, showPopup, windowType])

  // Render based on window type
  switch (windowType) {
    case 'floating':
      return <FloatingWindowWrapper />

    case 'drawer':
      return <DrawerWindowWrapper />

    case 'popup':
      return <PopupWindowWrapper />

    case 'main':
    default:
      return <RouterProvider router={mainRouter} />
  }
}

export default App
