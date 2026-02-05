import { useState, useCallback } from 'react'

interface UseClipboardCopyOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
  successDuration?: number
}

interface UseClipboardCopyReturn {
  isCopied: boolean
  copy: (text: string) => Promise<void>
  reset: () => void
}

export const useClipboardCopy = ({
  onSuccess,
  onError,
  successDuration = 2000,
}: UseClipboardCopyOptions = {}): UseClipboardCopyReturn => {
  const [isCopied, setIsCopied] = useState(false)
  const timeoutRef = useState<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        onSuccess?.()

        // 清除之前的定时器
        if (timeoutRef[0]) {
          clearTimeout(timeoutRef[0])
        }

        // 设置新的定时器
        timeoutRef[1](
          setTimeout(() => {
            setIsCopied(false)
          }, successDuration)
        )
      } catch (error) {
        console.error('Failed to copy:', error)
        onError?.(error as Error)
      }
    },
    [onSuccess, onError, successDuration, timeoutRef]
  )

  const reset = useCallback(() => {
    setIsCopied(false)
    if (timeoutRef[0]) {
      clearTimeout(timeoutRef[0])
      timeoutRef[1](null)
    }
  }, [timeoutRef])

  return {
    isCopied,
    copy,
    reset,
  }
}
