import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import type { Note, NoteFilters } from '../types'

// Re-export Note type for components
export type { Note } from '../types'

interface NotesState {
  notes: Note[]
  archivedNotes: Note[]
  selectedNote: Note | null
  isLoading: boolean
  error: string | null

  // Actions
  loadNotes: () => Promise<void>
  loadArchivedNotes: () => Promise<void>
  addNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  archiveNote: (id: string) => Promise<void>
  unarchiveNote: (id: string) => Promise<void>
  toggleFavorite: (id: string, currentState: boolean) => Promise<void>
  selectNote: (note: Note | null) => void
  importNotes: (jsonData: string) => Promise<{ success: number; failed: number }>
  exportNotes: () => Promise<string>

  // Getters
  getNoteById: (id: string) => Note | undefined
  getFilteredNotes: (filters: NoteFilters) => Note[]
  getStats: () => {
    total: number
    today: number
    week: number
    favorite: number
    byType: Record<string, number>
  }
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  archivedNotes: [],
  selectedNote: null,
  isLoading: false,
  error: null,

  loadNotes: async () => {
    set({ isLoading: true, error: null })
    try {
      const notes = await invoke<Note[]>('notes_get_all', {
        limit: 1000,
        offset: 0,
        includeArchived: false,
      })
      set({ notes, isLoading: false })
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  loadArchivedNotes: async () => {
    set({ isLoading: true, error: null })
    try {
      const notes = await invoke<Note[]>('notes_get_archived', {
        limit: 1000,
        offset: 0,
      })
      set({ archivedNotes: notes, isLoading: false })
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  addNote: async noteData => {
    try {
      const id = await invoke<string>('notes_create', {
        content: noteData.content,
        noteType: noteData.note_type,
        tags: noteData.tags,
        sourceApp: noteData.source_app || 'CoolQuick',
        title: noteData.title || undefined,
      })
      console.log('Note created with ID:', id)
      await get().loadNotes()
      console.log('Notes reloaded, count:', get().notes.length)
    } catch (error) {
      console.error('notes_create error:', error)
      set({ error: String(error) })
    }
  },

  updateNote: async (id, updates) => {
    try {
      await invoke('notes_update', { id, ...updates })
      set(state => ({
        notes: state.notes.map(n =>
          n.id === id ? { ...n, ...updates, updated_at: Date.now() / 1000 } : n
        ),
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },

  deleteNote: async id => {
    try {
      await invoke('notes_delete', { id })
      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
        archivedNotes: state.archivedNotes.filter(n => n.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },

  archiveNote: async id => {
    try {
      await invoke('notes_archive', { id })
      const note = get().notes.find(n => n.id === id)
      if (note) {
        set(state => ({
          notes: state.notes.filter(n => n.id !== id),
          archivedNotes: [note, ...state.archivedNotes],
        }))
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  unarchiveNote: async id => {
    try {
      await invoke('notes_unarchive', { id })
      const note = get().archivedNotes.find(n => n.id === id)
      if (note) {
        set(state => ({
          archivedNotes: state.archivedNotes.filter(n => n.id !== id),
          notes: [note, ...state.notes],
        }))
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  toggleFavorite: async (id, currentState) => {
    try {
      await invoke('notes_update', { id, isFavorite: !currentState })
      set(state => ({
        notes: state.notes.map(n => (n.id === id ? { ...n, is_favorite: !currentState } : n)),
        archivedNotes: state.archivedNotes.map(n =>
          n.id === id ? { ...n, is_favorite: !currentState } : n
        ),
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },

  selectNote: note => {
    set({ selectedNote: note })
  },

  importNotes: async jsonData => {
    try {
      const result = await invoke<{ success: number; failed: number }>('notes_import', {
        data: jsonData,
      })
      get().loadNotes()
      return result
    } catch (error) {
      set({ error: String(error) })
      return { success: 0, failed: 0 }
    }
  },

  exportNotes: async () => {
    try {
      return await invoke<string>('notes_export', { format: 'json' })
    } catch (error) {
      set({ error: String(error) })
      return ''
    }
  },

  getNoteById: id => {
    const state = get()
    return state.notes.find(n => n.id === id) || state.archivedNotes.find(n => n.id === id)
  },

  getFilteredNotes: filters => {
    let filtered = get().notes

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        n =>
          n.content.toLowerCase().includes(search) ||
          n.tags.some(t => t.toLowerCase().includes(search))
      )
    }

    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(n => filters.types?.includes(n.note_type))
    }

    if (filters.isFavorite !== undefined) {
      filtered = filtered.filter(n => n.is_favorite === filters.isFavorite)
    }

    if (filters.dateFrom) {
      const from = filters.dateFrom.getTime() / 1000
      filtered = filtered.filter(n => n.created_at >= from)
    }

    if (filters.dateTo) {
      const to = filters.dateTo.getTime() / 1000
      filtered = filtered.filter(n => n.created_at <= to)
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(n => filters.tags?.some(tag => n.tags.includes(tag)))
    }

    return filtered
  },

  getStats: () => {
    const state = get()
    const allNotes = [...state.notes, ...state.archivedNotes]
    const now = Date.now()
    const today = new Date().setHours(0, 0, 0, 0)
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000

    const byType: Record<string, number> = {}
    allNotes.forEach(n => {
      byType[n.note_type] = (byType[n.note_type] || 0) + 1
    })

    return {
      total: allNotes.length,
      today: allNotes.filter(n => n.created_at * 1000 >= today).length,
      week: allNotes.filter(n => n.created_at * 1000 >= weekAgo).length,
      favorite: allNotes.filter(n => n.is_favorite).length,
      byType,
    }
  },
}))

// Setup clipboard listener
export const setupClipboardListener = () => {
  const loadNotes = useNotesStore.getState().loadNotes

  listen('clipboard-change', () => {
    loadNotes()
  })
}
