'use client'

import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])

  const toast = useCallback((msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  return { toasts, toast }
}
