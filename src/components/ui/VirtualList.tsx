import React, { useRef, useEffect, useState, useCallback } from 'react'

interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  overscan?: number
  className?: string
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className = ''
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })

  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight

    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = start + visibleCount + overscan

    setVisibleRange({
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end)
    })
  }, [items.length, itemHeight, overscan])

  useEffect(() => {
    calculateVisibleRange()
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', calculateVisibleRange)
    window.addEventListener('resize', calculateVisibleRange)

    return () => {
      container.removeEventListener('scroll', calculateVisibleRange)
      window.removeEventListener('resize', calculateVisibleRange)
    }
  }, [calculateVisibleRange])

  const visibleItems = items.slice(visibleRange.start, visibleRange.end)
  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={index + visibleRange.start}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index + visibleRange.start)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
