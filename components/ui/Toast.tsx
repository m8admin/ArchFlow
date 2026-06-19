'use client'

import { useEffect, useRef } from 'react'

export function ToastItem({ msg }: { msg: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => el.classList.add('show'))
  }, [])
  return <div className="toast" ref={ref}>{msg}</div>
}

export function ToastContainer({ toasts }: { toasts: { id: number; msg: string }[] }) {
  return (
    <div className="tw-wrap">
      {toasts.map(t => <ToastItem key={t.id} msg={t.msg} />)}
    </div>
  )
}
