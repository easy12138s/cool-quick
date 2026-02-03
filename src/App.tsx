import React, { useEffect } from 'react'
import { 
  createBrowserRouter, 
  RouterProvider,
  Navigate
} from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { MainLayout } from './components/layout/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { NotesPage } from './pages/NotesPage'
import { ArchivePage } from './pages/ArchivePage'
import { SettingsPage } from './pages/SettingsPage'
import { SearchPage } from './pages/SearchPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { StatisticsPage } from './pages/StatisticsPage'
import FloatingWindow from './components/FloatingWindow'
import Drawer from './components/Drawer'
import Popup from './components/Popup'
import { setupClipboardListener } from './stores/useNotesStore'
import { setupThemeListener } from './stores/useConfigStore'
import { useNotesStore } from './stores/useNotesStore'
import { useConfigStore } from './stores/useConfigStore'
import { usePopupStore } from './stores/usePopupStore'

// Window type detection
const getWindowLabel = () => {
  return (window as any).__TAURI_METADATA__?.currentWindow?.label || 'main'
}

// Router for main window
const mainRouter = createBrowserRouter([
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
    ]
  }
])

// Floating window component
const FloatingWindowWrapper: React.FC = () => {
  const { loadNotes, notes } = useNotesStore()
  const { config } = useConfigStore()
  
  const handleMouseEnter = () => {
    // Open drawer window via Tauri
    const { invoke } = require('@tauri-apps/api/tauri')
    invoke('window_show_drawer')
  }
  
  return (
    <FloatingWindow 
      onMouseEnter={handleMouseEnter}
      config={config}
      noteCount={notes.length}
    />
  )
}

// Drawer window component
const DrawerWindowWrapper: React.FC = () => {
  const { notes, loadNotes } = useNotesStore()
  
  useEffect(() => {
    loadNotes()
  }, [loadNotes])
  
  const handleCopy = async (content: string) => {
    const { invoke } = require('@tauri-apps/api/tauri')
    await invoke('clipboard_set_text', { content })
  }
  
  return (
    <Drawer
      notes={notes}
      onCopy={handleCopy}
      onRefresh={loadNotes}
      config={null}
    />
  )
}

// Popup window component
const PopupWindowWrapper: React.FC = () => {
  const { popupData, hidePopup } = usePopupStore()
  const { config } = useConfigStore()
  const { loadNotes } = useNotesStore()
  
  const handleSave = async () => {
    hidePopup()
    await loadNotes()
  }
  
  if (!popupData) return null
  
  return (
    <Popup
      content={popupData.content}
      contentType={popupData.type}
      sourceApp={popupData.sourceApp}
      autoCloseSeconds={config?.popup_auto_close_seconds || 3}
      onSave={handleSave}
      onDismiss={hidePopup}
    />
  )
}

function App() {
  const windowLabel = getWindowLabel()
  const { config, loadConfig } = useConfigStore()
  const { showPopup, setPopupData } = usePopupStore()
  
  useEffect(() => {
    // Load config
    loadConfig()
    
    // Setup listeners
    setupClipboardListener()
    setupThemeListener()
    
    // Listen for clipboard changes (for popup)
    const unlistenClipboard = listen('clipboard-change', (event: any) => {
      setPopupData(event.payload)
      showPopup()
    })
    
    return () => {
      unlistenClipboard.then(f => f())
    }
  }, [loadConfig, setPopupData, showPopup])
  
  // Render based on window type
  switch (windowLabel) {
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
