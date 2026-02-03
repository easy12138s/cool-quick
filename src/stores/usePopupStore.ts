import { create } from 'zustand'

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
  hidePopup: () => set({ isVisible: false, popupData: null })
}))
