import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/tauri'

interface PopupData {
  content: string
  type: string
  sourceApp?: string
}

interface PopupState {
  popupData: PopupData | null
  isVisible: boolean
  
  setPopupData: (data: PopupData) => void
  showPopup: () => void
  hidePopup: () => void
}

export const usePopupStore = create<PopupState>((set) => ({
  popupData: null,
  isVisible: false,
  
  setPopupData: (data) => set({ popupData: data }),
  showPopup: () => set({ isVisible: true }),
  hidePopup: () => {
    // Hide the Tauri popup window
    invoke('window_hide_popup').catch(() => {})
    set({ isVisible: false, popupData: null })
  }
}))
