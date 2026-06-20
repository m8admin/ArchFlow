'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Badge'
import type { AppDB, Project, ZoomLevel, Status } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { clientColor, workerColor, dlCls, wkDays, fmtFull, projectAggregates } from '@/lib/utils'

interface Props {
  db: AppDB
  filterClient: string
  filterStatus: string
  zoom: ZoomLevel
  setZoom: (z: ZoomLevel) => void
  setFilterClient: (c: string) => void
  setFilterStatus: (s: string) => void
  onEditProject: (p: Project) => void
  onNewProject: () => void
  onNewMilestone: (projectId?: string) => void
  onNewSubtask: (projectId: string, milestoneId: string) => void
  onEditTask: (id: string) => void
}

export function BoardView({ db, filterClient, filterStatus, zoom, setZoom, setFilterClient, setFilterStatus, onEditProject, onNewProject, onNewMilestone, onNewSubtask, onEditTask }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const projectsWithAgg = db.projects.map(p => {
    const allProjectTasks = db.tasks.filter(t => t.project_id === p.id)
    const milestones = allProjectTasks.filter(t => (t.kind || 'milestone') === 'milestone' && !t.parent_milestone_id)
    const projectTasks = allProjectTasks.filter(t => t.kind === 'task' && !t.parent_milestone_id)
    const agg = projectAggregates(allProjectTasks)
    return { ...p, ...agg, milestones, projectTasks }
  })

  const projects = projectsWithAgg.filter(p => {
    if (filterClient && p.client_id !== filterClient) return false
    if (filterStatus && p.status !== filterStatus) return false
    return true
  })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const active = projectsWithAgg.filter(p => p.status === 'active').length
  const delayed = projectsWithAgg.filter(p => p.status === 'delayed').length
  const dueSoon = db.tasks.filter(t => { const ms = new Date(t.end_date).getTime() - today.getTime(); return ms >= 0 && ms < 7 * 86400000 && t.status !== 'done' }).length
  const avg = projectsWithAgg.length ? Math.round(projectsWithAgg.reduce((a, p) => a + p.pct, 0) / projectsWithAgg.length) : 0
  const totalWD = projectsWithAgg.filter(p => p.start && p.end).reduce((a, p) => a + wkDays(p.start, p.end), 0)
  const sqmProjs = db.projects.filter(p => (p.sqm || 0) > 0)
  const avgSqm = sqmProjs.length ? Math.round(sqmProjs.reduce((a, p) => a + (p.sqm || 0), 0) / sqmProjs.length) : 0

  function clientName(cid: string) { return db.clients.find(c => c.id === cid)?.name || '?' }

  function CoordinatorCell({ coordId, coordType }: { coordId: string | null; coordType: 'worker' | 'contractor' | null }) {
    if (!coordId) return <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>
    const person = coordType === 'worker'
      ? db.workers.find(w => w.id === coordId)
      : db.contractors.find(c => c.id === coordId)
    if (!person) return <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>
    const col = coordType === 'worker' ? workerColor(db.workers, coordId) : '#555E89'
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: col + '18', color: col, border: `1px solid ${col}33` }}>{person.name}</span>
  }

  function ModellerCell({ wids, cids }: { wids: string[]; cids: string[] }) {
    if (!wids.length && !cids.length) return <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>
    return (
      <span style={{ whiteSpace: 'normal', lineHeight: 1.7 }}>
        {wids.map(id => { const w = db.workers.find(x => x.id === id); if (!w) return null; const col = workerColor(db.workers, id); return <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: col + '18', color: col, border: `1px solid ${col}33`, margin: 1 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: col }} />{w.name}</span> })}
        {cids.map(id => { const sc = db.contractors.find(x => x.id === id); if (!sc) return null; return <span key={id} className="tag" style={{ fontSize: 11, margin: 1 }}>{sc.name}</span> })}
      </span>
    )
  }

  const ZOOMS: ZoomLevel[] = ['day', 'week', 'month', '3month', 'year']

  return (
    <>
      {/* Stats */}
      <div className="sstrip">
        {[
          { l: 'PROJECTS', v: db.projects.length, s: `${db.clients.length} clients` },
          { l: 'ACTIVE', v: active, style: { color: 'var(--bl)' } },
          { l: 'DELAYED', v: delayed, style: { color: 'var(--rd)' } },
          { l: 'TOTAL WORKING DAYS', v: totalWD.toLocaleString(), s: 'across all projects' },
          { l: 'AVG TYPICAL SQM', v: avgSqm ? `${avgSqm.toLocaleString()} m²` : '—' },
          { l: 'DUE THIS WEEK', v: dueSoon, s: 'milestones', style: dueSoon > 0 ? { color: 'var(--am)' } : {} },
          { l: 'AVG PROGRESS', v: `${avg}%` },
        ].map(s => (
          <div key={s.l} className="sc">
            <div className="sc-l">{s.l}</div>
            <div className="sc-v" style={(s as { style?: React.CSSProperties }).style}>{s.v}</div>
            {(s as { s?: string }).s && <div className="sc-s">{(s as { s?: string }).s}</div>}
          </div>
        ))}
      </div>

      {/* Legend */}
      {db.clients.length > 0 && (
        <div className="lgnd">
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.06em', marginBottom: 5 }}>CLIENTS</div>
              <div>
                {db.clients.map(c => { const col = clientColor(db.clients, c.id); return <span key={c.id} className="lchip" style={{ background: col + '18', borderColor: col + '44', color: col }}><span className="ldot" style={{ background: col }} />{c.name}</span> })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.06em', marginBottom: 5 }}>STATUS</div>
              <div>
                {Object.entries(STATUS_META).map(([k, v]) => <span key={k} className="lchip" style={{ background: v.bg, color: v.col }}><span className="ldot" style={{ background: v.col }} />{v.label}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="tbar">
        <div className="zg">
          {ZOOMS.map(z => <button key={z} className={`zb${zoom === z ? ' act' : ''}`} onClick={() => setZoom(z)}>{z === '3month' ? '3 Mo' : z.charAt(0).toUpperCase() + z.slice(1)}</button>)}
        </div>
        <select style={{ fontSize: 12 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">All clients</option>
          {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={{ fontSize: 12 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | '')}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="tb-r">
          <button className="btn bsm" onClick={() => onNewMilestone()}>+ Add milestone</button>
          <button className="btn bp bsm" onClick={onNewProject}>+ New project</button>
        </div>
      </div>

      {/* Table */}
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 185 }}>Project / Milestone</th>
              <th>Client</th><th>sqm</th><th>Use</th><th>Floors</th>
              <th>Coordinator</th>
              <th style={{ minWidth: 160 }}>Modellers</th>
              <th>Start</th><th>Deadline</th><th>Status</th>
              <th style={{ minWidth: 90 }}>Progress</th><th>%</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {!projects.length ? (
              <tr className="er"><td colSpan={13}>No projects match — <button className="btn bsm" onClick={() => { setFilterClient(''); setFilterStatus('') }}>Clear filters</button></td></tr>
            ) : projects.map(p => {
              const col = clientColor(db.clients, p.client_id)
              const isCol = !!collapsed[p.id]
              const dc = p.end ? dlCls(p.end) : ''
              return [
                <tr key={p.id} className="pr">
                  <td>
                    <button className="btn bxs" style={{ background: 'none', border: 'none', padding: '2px 4px', color: 'var(--tx3)', fontSize: 11 }} onClick={() => toggle(p.id)}>
                      {isCol ? '▶' : '▼'}
                    </button>
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: col, marginRight: 5, verticalAlign: 'middle' }} />
                    <span className="pnc" onClick={() => onEditProject(p)}>{p.name}</span>
                  </td>
                  <td><span className="tag" style={{ borderColor: col + '44', color: col }}>{clientName(p.client_id)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--tx2)' }}>{p.sqm ? `${p.sqm.toLocaleString()} m²` : '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--tx2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.uses || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--tx2)' }}>{p.floors || '—'}</td>
                  <td colSpan={2}></td>
                  <td style={{ fontSize: 12 }}>{p.start ? fmtFull(p.start) : '—'}</td>
                  <td style={{ fontSize: 12 }} className={dc}>{p.end ? fmtFull(p.end) : '—'}</td>
                  <td><Badge status={p.status} /></td>
                  <td><ProgressBar status={p.status} pct={p.pct} /></td>
                  <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{p.pct}%</td>
                  <td><button className="bi" onClick={() => onEditProject(p)}>✎</button></td>
                </tr>,
                ...(!isCol ? (
                  (p.milestones.length === 0 && p.projectTasks.length === 0)
                    ? [<tr key={`${p.id}-empty`} className="tk"><td className="ind" colSpan={13} style={{ color: 'var(--tx3)', fontSize: 12 }}>No milestones — <button className="btn bsm" onClick={() => onNewMilestone(p.id)}>+ Add milestone</button> <button className="btn bsm" onClick={() => onNewSubtask(p.id, '')}>+ Add task</button></td></tr>]
                    : [
                      // Milestones and their subtasks
                      ...p.milestones.flatMap(m => {
                        const mdc = dlCls(m.end_date)
                        const subtasks = db.tasks.filter(t => t.parent_milestone_id === m.id && t.kind === 'task')
                        return [
                          <tr key={m.id} className="tk">
                            <td className="ind" style={{ fontWeight: 600 }}>↪ <span className="pnc" onClick={() => onEditTask(m.id)}>{m.name}</span>{m.modeller_hours ? <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 400, marginLeft: 6 }}>{m.modeller_hours}h</span> : null}</td>
                            <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{clientName(p.client_id)}</td>
                            <td colSpan={3}></td>
                            <td><CoordinatorCell coordId={m.coordinator_id} coordType={m.coordinator_type} /></td>
                            <td style={{ maxWidth: 180 }}><ModellerCell wids={m.modeller_worker_ids || []} cids={m.modeller_contractor_ids || []} /></td>
                            <td style={{ fontSize: 12 }}>{fmtFull(m.start_date)}</td>
                            <td style={{ fontSize: 12 }} className={mdc}>{fmtFull(m.end_date)}</td>
                            <td><Badge status={m.status} /></td>
                            <td><ProgressBar status={m.status} pct={m.pct} /></td>
                            <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{m.pct}%</td>
                            <td>
                              <div style={{ display: 'flex', gap: 2 }}>
                                <button className="bi" onClick={() => onEditTask(m.id)}>✎</button>
                                <button className="bi" title="Add task" onClick={() => onNewSubtask(p.id, m.id)}>+</button>
                              </div>
                            </td>
                          </tr>,
                          ...subtasks.map(st => {
                            const stdc = dlCls(st.end_date)
                            return (
                              <tr key={st.id} className="tk">
                                <td style={{ paddingLeft: 48, fontSize: 12, color: 'var(--tx2)' }}>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--bl-tx)', background: 'var(--bl-bg)', padding: '1px 6px', borderRadius: 10, marginRight: 5 }}>Task</span>
                                  <span className="pnc" onClick={() => onEditTask(st.id)}>{st.name}</span>
                                </td>
                                <td></td>
                                <td colSpan={3}></td>
                                <td><CoordinatorCell coordId={st.coordinator_id} coordType={st.coordinator_type} /></td>
                                <td style={{ maxWidth: 180 }}><ModellerCell wids={st.modeller_worker_ids || []} cids={st.modeller_contractor_ids || []} /></td>
                                <td style={{ fontSize: 12 }}>{fmtFull(st.start_date)}</td>
                                <td style={{ fontSize: 12 }} className={stdc}>{fmtFull(st.end_date)}</td>
                                <td><Badge status={st.status} /></td>
                                <td><ProgressBar status={st.status} pct={st.pct} /></td>
                                <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{st.pct}%</td>
                                <td><button className="bi" onClick={() => onEditTask(st.id)}>✎</button></td>
                              </tr>
                            )
                          })
                        ]
                      }),
                      // Project-level tasks (not under any milestone)
                      ...p.projectTasks.map(st => {
                        const stdc = dlCls(st.end_date)
                        return (
                          <tr key={st.id} className="tk">
                            <td className="ind" style={{ fontSize: 12, color: 'var(--tx2)' }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--bl-tx)', background: 'var(--bl-bg)', padding: '1px 6px', borderRadius: 10, marginRight: 5 }}>Task</span>
                              <span className="pnc" onClick={() => onEditTask(st.id)}>{st.name}</span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{clientName(p.client_id)}</td>
                            <td colSpan={3}></td>
                            <td><CoordinatorCell coordId={st.coordinator_id} coordType={st.coordinator_type} /></td>
                            <td style={{ maxWidth: 180 }}><ModellerCell wids={st.modeller_worker_ids || []} cids={st.modeller_contractor_ids || []} /></td>
                            <td style={{ fontSize: 12 }}>{fmtFull(st.start_date)}</td>
                            <td style={{ fontSize: 12 }} className={stdc}>{fmtFull(st.end_date)}</td>
                            <td><Badge status={st.status} /></td>
                            <td><ProgressBar status={st.status} pct={st.pct} /></td>
                            <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{st.pct}%</td>
                            <td><button className="bi" onClick={() => onEditTask(st.id)}>✎</button></td>
                          </tr>
                        )
                      }),
                      // Add buttons row
                      <tr key={`${p.id}-add`} className="tk">
                        <td className="ind" colSpan={13} style={{ fontSize: 12 }}>
                          <button className="btn bxs" onClick={() => onNewMilestone(p.id)}>+ Milestone</button>{' '}
                          <button className="btn bxs" onClick={() => onNewSubtask(p.id, '')}>+ Task</button>
                        </td>
                      </tr>,
                    ]
                ) : [])
              ]
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
