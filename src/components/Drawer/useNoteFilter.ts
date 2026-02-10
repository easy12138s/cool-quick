import { useState, useMemo, useRef, useEffect } from 'react'
import type { Note } from '../../stores/useNotesStore'

interface UseNoteFilterProps {
  notes: Note[]
}

interface UseNoteFilterReturn {
  filteredNotes: Note[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedType: string | null
  setSelectedType: (type: string | null) => void
  sortMode: SortMode
  setSortMode: (mode: SortMode) => void
  uniqueTypes: string[]
}

export type SortMode = 'time' | 'favorite' | 'type' | 'usage'

export const useNoteFilter = ({ notes }: UseNoteFilterProps): UseNoteFilterReturn => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // 防抖搜索
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.toLowerCase().trim())
    }, 200)

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [searchQuery])

  const filteredNotes = useMemo(() => {
    let result = [...notes]

    // 搜索过滤
    if (debouncedQuery) {
      result = result.filter(
        note =>
          note.content.toLowerCase().includes(debouncedQuery) ||
          note.note_type.toLowerCase().includes(debouncedQuery) ||
          note.tags.some(tag => tag.toLowerCase().includes(debouncedQuery))
      )
    }

    // 类型过滤
    if (selectedType) {
      result = result.filter(note => note.note_type === selectedType)
    }

    // 排序
    result.sort((a, b) => {
      switch (sortMode) {
        case 'time':
          return b.created_at - a.created_at
        case 'favorite':
          if (a.is_favorite === b.is_favorite) return b.created_at - a.created_at
          return a.is_favorite ? -1 : 1
        case 'type':
          if (a.note_type === b.note_type) return b.created_at - a.created_at
          return a.note_type.localeCompare(b.note_type)
        case 'usage':
          return b.use_count - a.use_count
        default:
          return 0
      }
    })

    return result
  }, [notes, debouncedQuery, selectedType, sortMode])

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(notes.map(n => n.note_type)))
  }, [notes])

  return {
    filteredNotes,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    sortMode,
    setSortMode,
    uniqueTypes,
  }
}
