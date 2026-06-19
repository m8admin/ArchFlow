'use client'

import { useEffect } from 'react'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={`overlay${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="m-hd">
          <div className="m-title">{title}</div>
          <button className="xcl" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
