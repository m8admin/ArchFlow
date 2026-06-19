import type { Status } from '@/lib/types'

export function Badge({ status }: { status: Status }) {
  return <span className={`badge b-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

export function ProgressBar({ status, pct }: { status: Status; pct: number }) {
  return (
    <div className="bw">
      <div className={`bfill ${status}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
