'use client'

import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Badge'
import type { AppDB } from '@/lib/types'
import { clientColor, dlCls, fmtFull, initials } from '@/lib/utils'

interface Props {
  db: AppDB
  onOpenProfile: (type: 'contractor', id: string) => void
  onEditTask: (id: string) => void
}

export function SubView({ db, onOpenProfile }: Props) {
  const today = new Date(); today.setHours(0, 0, 0, 0)

  if (!db.contractors.length) return <div className="ems">No subcontractors in directory yet.</div>

  return (
    <div>
      <div className="pg-t">Subcontractor workload</div>
      {db.contractors.map(sc => {
        const tasks = db.tasks.filter(t => (t.modeller_contractor_ids || []).includes(sc.id) || (t.coordinator_id === sc.id && t.coordinator_type === 'contractor'))
        const active = tasks.filter(t => t.status === 'active').length
        const done = tasks.filter(t => t.status === 'done').length
        const delayed = tasks.filter(t => t.status === 'delayed').length

        return (
          <div key={sc.id} className="sub-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bl)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {initials(sc.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                    {sc.role}{sc.role ? ' · ' : ''}{tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {active > 0 && <span className="badge b-active">{active} active</span>}
                {delayed > 0 && <span className="badge b-delayed">{delayed} delayed</span>}
                {done > 0 && <span className="badge b-done">{done} done</span>}
                <button className="btn bxs" onClick={() => onOpenProfile('contractor', sc.id)}>Profile →</button>
              </div>
            </div>

            {tasks.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--tx3)' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Task</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Project</th>
                    <th style={{ padding: '4px 8px', fontWeight: 500 }}>Deadline</th>
                    <th style={{ padding: '4px 8px', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '4px 8px', fontWeight: 500 }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => {
                    const proj = db.projects.find(p => p.id === t.project_id) || { name: '?', client_id: '' }
                    const col = clientColor(db.clients, proj.client_id)
                    const dc = dlCls(t.end_date)
                    return (
                      <tr key={t.id} style={{ borderTop: '1px solid var(--bd)' }}>
                        <td style={{ padding: '5px 8px' }}>{t.name}</td>
                        <td style={{ padding: '5px 8px', color: col, fontWeight: 500 }}>{proj.name}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }} className={dc}>{fmtFull(t.end_date)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}><Badge status={t.status} /></td>
                        <td style={{ padding: '5px 8px', minWidth: 80 }}><ProgressBar status={t.status} pct={t.pct} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--tx3)', fontSize: 12, padding: '4px 0' }}>No tasks assigned yet.</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
