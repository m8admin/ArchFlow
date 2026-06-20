'use client'

import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Badge'
import type { AppDB, DirType, Contact, Project } from '@/lib/types'
import { clientColor, workerColor, dlCls, fmtFull, initials, wkDays, projectAggregates } from '@/lib/utils'

interface Props {
  db: AppDB
  type: DirType
  id: string
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onEditProject: (id: string) => void
  onFilterClient: (id: string) => void
  onAddContact: () => void
  onEditContact: (ct: Contact) => void
  onDeleteContact: (ctId: string) => void
}

const TYPE_LABELS: Record<DirType, string> = { client: 'Client', contractor: 'Subcontractor', worker: 'Worker' }
const BACK_VIEWS: Record<DirType, string> = { client: 'Clients', contractor: 'Subcontractors', worker: 'Workers' }

export function ProfileView({ db, type, id, onBack, onEdit, onDelete, onEditProject, onFilterClient, onAddContact, onEditContact, onDeleteContact }: Props) {
  const list = type === 'client' ? db.clients : type === 'contractor' ? db.contractors : db.workers
  const item = list.find(x => x.id === id)
  if (!item) return <div className="ems">Not found.</div>

  const color = type === 'client' ? clientColor(db.clients, id)
    : type === 'worker' ? workerColor(db.workers, id) : '#555E89'

  const today = new Date(); today.setHours(0, 0, 0, 0)

  return (
    <div>
      <div className="back" onClick={onBack}>← Back to {BACK_VIEWS[type]}</div>

      <div className="p-hdr">
        <div className="p-av" style={{ background: color }}>{initials(item.name)}</div>
        <div style={{ flex: 1 }}>
          <div className="p-name">{item.name}</div>
          <div className="p-role">{item.role || TYPE_LABELS[type]}</div>
          <div className="p-cts">
            {(item.email || []).map((e, i) => <span key={i} className="pct-tag">✉ {e}</span>)}
            {(item.phone || []).map((p, i) => <span key={i} className="pct-tag">☎ {p}</span>)}
            {item.notes && <span className="pct-tag" style={{ color: 'var(--tx2)' }}>📝 {item.notes}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {type === 'client' && (
            <button className="btn bsm" style={{ background: 'var(--bl-bg)', color: 'var(--bl-tx)' }} onClick={() => onFilterClient(id)}>
              📊 View projects
            </button>
          )}
          <button className="btn bsm" onClick={onEdit}>✎ Edit</button>
          <button className="btn bd-btn bsm" onClick={onDelete}>Delete</button>
        </div>
      </div>

      {type === 'client' && <ClientProfile db={db} id={id} onEditProject={onEditProject} item={item as typeof db.clients[0]} onAddContact={onAddContact} onEditContact={onEditContact} onDeleteContact={onDeleteContact} />}
      {type === 'contractor' && <ContractorProfile db={db} id={id} item={item as typeof db.contractors[0]} onAddContact={onAddContact} onEditContact={onEditContact} onDeleteContact={onDeleteContact} />}
      {type === 'worker' && <WorkerProfile db={db} id={id} onEditProject={onEditProject} />}
    </div>
  )
}

function ClientProfile({ db, id, onEditProject, item, onAddContact, onEditContact, onDeleteContact }: { db: AppDB; id: string; onEditProject: (id: string) => void; item: typeof db.clients[0]; onAddContact: () => void; onEditContact: (ct: Contact) => void; onDeleteContact: (id: string) => void }) {
  const pp = db.projects.filter(p => p.client_id === id).map(p => {
    const milestones = db.tasks.filter(t => t.project_id === p.id)
    const agg = projectAggregates(milestones)
    return { ...p, ...agg }
  })
  const tt = pp.flatMap(p => db.tasks.filter(t => t.project_id === p.id))
  const active = pp.filter(p => p.status === 'active').length
  const delayed = pp.filter(p => p.status === 'delayed').length
  const done = pp.filter(p => p.status === 'done').length
  const avg = pp.length ? Math.round(pp.reduce((a, p) => a + p.pct, 0) / pp.length) : 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const ds = tt.filter(t => { const ms = new Date(t.end_date).getTime() - today.getTime(); return ms >= 0 && ms < 7 * 86400000 && t.status !== 'done' }).length
  const totalWD = pp.filter(p => p.start && p.end).reduce((a, p) => a + wkDays(p.start, p.end), 0)
  const sqmP = pp.filter(p => (p.sqm || 0) > 0)
  const avgSqm = sqmP.length ? Math.round(sqmP.reduce((a, p) => a + (p.sqm || 0), 0) / sqmP.length) : 0
  return (
    <>
      <div className="pg">
        {[
          { l: 'TOTAL PROJECTS', v: pp.length },
          { l: 'ACTIVE', v: active, style: { color: 'var(--bl)' } },
          { l: 'DELAYED', v: delayed, style: { color: 'var(--rd)' } },
          { l: 'COMPLETED', v: done, style: { color: 'var(--gn)' } },
          { l: 'AVG PROGRESS', v: `${avg}%` },
          { l: 'DUE THIS WEEK', v: ds, style: ds > 0 ? { color: 'var(--am)' } : {} },
          { l: 'TOTAL WORKING DAYS', v: totalWD.toLocaleString() },
          { l: 'AVG TYPICAL SQM', v: avgSqm ? `${avgSqm.toLocaleString()} m²` : '—' },
        ].map(s => (
          <div key={s.l} className="pstat"><div className="ps-l">{s.l}</div><div className="ps-v" style={(s as {style?:React.CSSProperties}).style}>{s.v}</div></div>
        ))}
      </div>
      {pp.length > 0 && (
        <>
          <div className="sec-t">Projects</div>
          <div className="tw" style={{ marginBottom: 14 }}>
            <table><thead><tr><th>Project</th><th>Use</th><th>sqm</th><th>Floors</th><th>Start</th><th>Deadline</th><th>Status</th><th>Progress</th><th>%</th><th></th></tr></thead>
              <tbody>
                {pp.map(p => { const dc = p.end ? dlCls(p.end) : ''; return (
                  <tr key={p.id} className="pr">
                    <td><span className="pnc" onClick={() => onEditProject(p.id)}>{p.name}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--tx2)' }}>{p.uses || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--tx2)' }}>{p.sqm ? `${p.sqm.toLocaleString()} m²` : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--tx2)' }}>{p.floors || '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.start ? fmtFull(p.start) : '—'}</td>
                    <td style={{ fontSize: 12 }} className={dc}>{p.end ? fmtFull(p.end) : '—'}</td>
                    <td><Badge status={p.status} /></td>
                    <td><ProgressBar status={p.status} pct={p.pct} /></td>
                    <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{p.pct}%</td>
                    <td><button className="bi" onClick={() => onEditProject(p.id)}>✎</button></td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </>
      )}
      <ContactsSection contacts={item.contacts || []} onAdd={onAddContact} onEdit={onEditContact} onDelete={onDeleteContact} projects={db.projects} />
    </>
  )
}

function ContractorProfile({ db, id, item, onAddContact, onEditContact, onDeleteContact }: { db: AppDB; id: string; item: typeof db.contractors[0]; onAddContact: () => void; onEditContact: (ct: Contact) => void; onDeleteContact: (id: string) => void }) {
  const ctt = db.tasks.filter(t => (t.modeller_contractor_ids || []).includes(id) || (t.coordinator_id === id && t.coordinator_type === 'contractor'))
  const cprojs = [...new Set(ctt.map(t => t.project_id))].map(pid => db.projects.find(p => p.id === pid)).filter(Boolean)
  const ca = ctt.filter(t => t.status === 'active').length
  const cd = ctt.filter(t => t.status === 'done').length
  const cdl = ctt.filter(t => t.status === 'delayed').length
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const cds = ctt.filter(t => { const ms = new Date(t.end_date).getTime() - today.getTime(); return ms >= 0 && ms < 7 * 86400000 && t.status !== 'done' }).length
  const cprojsAgg = cprojs.map(p => { const agg = projectAggregates(db.tasks.filter(t => t.project_id === p.id)); return { ...p, ...agg } })
  const ctWD = cprojsAgg.filter(p => p.start && p.end).reduce((a, p) => a + wkDays(p.start, p.end), 0)
  return (
    <>
      <div className="pg">
        {[
          { l: 'TOTAL MILESTONES', v: ctt.length },
          { l: 'ACTIVE', v: ca, style: { color: 'var(--bl)' } },
          { l: 'DELAYED', v: cdl, style: { color: 'var(--rd)' } },
          { l: 'COMPLETED', v: cd, style: { color: 'var(--gn)' } },
          { l: 'PROJECTS INVOLVED', v: cprojs.length },
          { l: 'DUE THIS WEEK', v: cds, style: cds > 0 ? { color: 'var(--am)' } : {} },
          { l: 'TOTAL WORKING DAYS', v: ctWD.toLocaleString() },
        ].map(s => (
          <div key={s.l} className="pstat"><div className="ps-l">{s.l}</div><div className="ps-v" style={(s as {style?:React.CSSProperties}).style}>{s.v}</div></div>
        ))}
      </div>
      {ctt.length > 0 && (
        <>
          <div className="sec-t">Assigned milestones</div>
          <div className="tw" style={{ marginBottom: 14 }}>
            <table><thead><tr><th>Milestone</th><th>Project</th><th>Role</th><th>Start</th><th>Deadline</th><th>Status</th><th>Progress</th></tr></thead>
              <tbody>
                {ctt.map(t => {
                  const proj = db.projects.find(p => p.id === t.project_id) || { name: '?', client_id: '' }
                  const col = clientColor(db.clients, proj.client_id)
                  const dc = dlCls(t.end_date)
                  const role = t.coordinator_id === id ? 'Coordinator' : 'Modeller'
                  return (
                    <tr key={t.id} className="dr">
                      <td>{t.name}</td>
                      <td style={{ color: col, fontWeight: 500 }}>{proj.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--tx2)' }}>{role}</td>
                      <td style={{ fontSize: 12 }}>{fmtFull(t.start_date)}</td>
                      <td style={{ fontSize: 12 }} className={dc}>{fmtFull(t.end_date)}</td>
                      <td><Badge status={t.status} /></td>
                      <td style={{ minWidth: 90 }}><ProgressBar status={t.status} pct={t.pct} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <ContactsSection contacts={item.contacts || []} onAdd={onAddContact} onEdit={onEditContact} onDelete={onDeleteContact} projects={db.projects} />
    </>
  )
}

function WorkerProfile({ db, id, onEditProject }: { db: AppDB; id: string; onEditProject: (id: string) => void }) {
  const wtt = db.tasks.filter(t => (t.modeller_worker_ids || []).includes(id) || (t.coordinator_id === id && t.coordinator_type === 'worker'))
  const wpp = [...new Set(wtt.map(t => t.project_id))].map(pid => db.projects.find(p => p.id === pid)).filter(Boolean) as typeof db.projects
  const wa = wtt.filter(t => t.status === 'active').length
  const wd2 = wtt.filter(t => t.status === 'done').length
  const wdl = wtt.filter(t => t.status === 'delayed').length
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const wds = wtt.filter(t => { const ms = new Date(t.end_date).getTime() - today.getTime(); return ms >= 0 && ms < 7 * 86400000 && t.status !== 'done' }).length
  return (
    <>
      <div className="pg">
        {[
          { l: 'PROJECTS', v: wpp.length },
          { l: 'TOTAL MILESTONES', v: wtt.length },
          { l: 'ACTIVE', v: wa, style: { color: 'var(--bl)' } },
          { l: 'DELAYED', v: wdl, style: { color: 'var(--rd)' } },
          { l: 'COMPLETED', v: wd2, style: { color: 'var(--gn)' } },
          { l: 'DUE THIS WEEK', v: wds, style: wds > 0 ? { color: 'var(--am)' } : {} },
        ].map(s => (
          <div key={s.l} className="pstat"><div className="ps-l">{s.l}</div><div className="ps-v" style={(s as {style?:React.CSSProperties}).style}>{s.v}</div></div>
        ))}
      </div>
      {wpp.length > 0 && (
        <>
          <div className="sec-t">Projects</div>
          <div className="tw" style={{ marginBottom: 14 }}>
            <table><thead><tr><th>Project</th><th>Client</th><th>Deadline</th><th>Status</th><th>Progress</th></tr></thead>
              <tbody>
                {wpp.map(p => { const agg = projectAggregates(db.tasks.filter(t => t.project_id === p.id)); const col = clientColor(db.clients, p.client_id); const dc = agg.end ? dlCls(agg.end) : ''; const cn = db.clients.find(c => c.id === p.client_id)?.name || '?'; return (
                  <tr key={p.id} className="pr">
                    <td><span className="pnc" onClick={() => onEditProject(p.id)}>{p.name}</span></td>
                    <td style={{ color: col, fontWeight: 500 }}>{cn}</td>
                    <td style={{ fontSize: 12 }} className={dc}>{agg.end ? fmtFull(agg.end) : '—'}</td>
                    <td><Badge status={agg.status} /></td>
                    <td style={{ minWidth: 90 }}><ProgressBar status={agg.status} pct={agg.pct} /></td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </>
      )}
      {wtt.length > 0 && (
        <>
          <div className="sec-t">Milestones</div>
          <div className="tw">
            <table><thead><tr><th>Milestone</th><th>Project</th><th>Role</th><th>Start</th><th>Deadline</th><th>Status</th><th>Progress</th></tr></thead>
              <tbody>
                {wtt.map(t => {
                  const proj = db.projects.find(p => p.id === t.project_id) || { name: '?', client_id: '' }
                  const col = clientColor(db.clients, proj.client_id)
                  const dc = dlCls(t.end_date)
                  const role = t.coordinator_id === id ? 'Coordinator' : 'Modeller'
                  return (
                    <tr key={t.id} className="dr">
                      <td>{t.name}</td>
                      <td style={{ color: col, fontWeight: 500 }}>{proj.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--tx2)' }}>{role}</td>
                      <td style={{ fontSize: 12 }}>{fmtFull(t.start_date)}</td>
                      <td style={{ fontSize: 12 }} className={dc}>{fmtFull(t.end_date)}</td>
                      <td><Badge status={t.status} /></td>
                      <td style={{ minWidth: 90 }}><ProgressBar status={t.status} pct={t.pct} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

function ContactsSection({ contacts, onAdd, onEdit, onDelete, projects }: { contacts: Contact[]; onAdd: () => void; onEdit: (ct: Contact) => void; onDelete: (id: string) => void; projects: Project[] }) {
  return (
    <div>
      <div className="sec-t">
        Contacts <button className="btn bxs" onClick={onAdd}>+ Add contact</button>
      </div>
      {!contacts.length ? (
        <div style={{ color: 'var(--tx3)', fontSize: 13, padding: '8px 0' }}>No contacts yet.</div>
      ) : contacts.map(ct => (
        <div key={ct.id} className="contact-card">
          <div className="contact-card-header">
            <div>
              <div className="contact-card-name">{ct.name}</div>
              <div className="contact-card-role">{ct.role}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn bxs" onClick={() => onEdit(ct)}>✎ Edit</button>
              <button className="btn bd-btn bxs" onClick={() => { if (confirm('Delete contact?')) onDelete(ct.id) }}>✕</button>
            </div>
          </div>
          <div className="contact-card-meta">
            {ct.email && <span className="contact-tag">✉ {ct.email}</span>}
            {ct.phone && <span className="contact-tag">☎ {ct.phone}</span>}
            {(ct.projects || []).map(pid => { const p = projects.find(x => x.id === pid); return p ? <span key={pid} className="tag" style={{ fontSize: 11 }}>{p.name}</span> : null })}
          </div>
        </div>
      ))}
    </div>
  )
}
