'use client'

import type { AppDB, DirType } from '@/lib/types'
import { clientColor, workerColor, initials } from '@/lib/utils'

interface Props {
  db: AppDB
  type: DirType
  onOpenProfile: (type: DirType, id: string) => void
  onAddEntry: (type: DirType) => void
}

const TITLES: Record<DirType, string> = { client: 'Clients', contractor: 'Subcontractors', worker: 'Company Workers' }
const ADD_LABELS: Record<DirType, string> = { client: 'Add client', contractor: 'Add subcontractor', worker: 'Add worker' }

export function DirectoryView({ db, type, onOpenProfile, onAddEntry }: Props) {
  const list = type === 'client' ? db.clients : type === 'contractor' ? db.contractors : db.workers

  return (
    <div>
      <div className="pg-t">
        {TITLES[type]}
        <button className="btn bp bsm" onClick={() => onAddEntry(type)}>+ {ADD_LABELS[type]}</button>
      </div>

      {!list.length ? (
        <div className="ems">No entries yet. Add one above.</div>
      ) : (
        <div className="dgrid">
          {list.map(item => {
            const color = type === 'client' ? clientColor(db.clients, item.id)
              : type === 'worker' ? workerColor(db.workers, item.id)
              : '#555E89'

            let s1: { v: number; l: string }, s2: { v: number; l: string }, s3: { v: number; l: string }

            if (type === 'client') {
              const pp = db.projects.filter(p => p.client_id === item.id)
              s1 = { v: pp.length, l: 'Projects' }
              s2 = { v: pp.filter(p => p.status === 'active').length, l: 'Active' }
              s3 = { v: ('contacts' in item && Array.isArray((item as {contacts?: unknown[]}).contacts) ? (item as {contacts: unknown[]}).contacts.length : 0), l: 'Contacts' }
            } else if (type === 'contractor') {
              const tt = db.tasks.filter(t => (t.modeller_contractor_ids || []).includes(item.id) || (t.coordinator_id === item.id && t.coordinator_type === 'contractor'))
              s1 = { v: tt.length, l: 'Milestones' }
              s2 = { v: tt.filter(t => t.status === 'active').length, l: 'Active' }
              s3 = { v: ('contacts' in item && Array.isArray((item as {contacts?: unknown[]}).contacts) ? (item as {contacts: unknown[]}).contacts.length : 0), l: 'Contacts' }
            } else {
              const wtt = db.tasks.filter(t => (t.modeller_worker_ids || []).includes(item.id) || (t.coordinator_id === item.id && t.coordinator_type === 'worker'))
              const wpp = new Set(wtt.map(t => t.project_id))
              s1 = { v: wpp.size, l: 'Projects' }
              s2 = { v: wtt.length, l: 'Milestones' }
              s3 = { v: wtt.filter(t => t.status === 'active').length, l: 'Active' }
            }

            return (
              <div key={item.id} className="dcard" onClick={() => onOpenProfile(type, item.id)}>
                <div className="dca" style={{ background: color }}>{initials(item.name)}</div>
                <div className="dc-n">{item.name}</div>
                <div className="dc-r">{item.role || type}</div>
                <div className="dc-m">
                  {item.email?.[0] && <span>✉ {item.email[0]}</span>}
                  {item.phone?.[0] && <span>☎ {item.phone[0]}</span>}
                </div>
                <div className="dc-s">
                  {[s1, s2, s3].map(s => (
                    <div key={s.l} className="dst">
                      <div className="dst-v">{s.v}</div>
                      <div className="dst-l">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
