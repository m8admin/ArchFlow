'use client'

import { useState } from 'react'
import type { AppDB, ZoomLevel, Status } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { clientColor, fmt, pd, ddiff, wkn } from '@/lib/utils'

const BAR_COL: Record<Status, string> = {
  planning: '#7C6FF7', active: '#2B6BE8', review: '#D4900A', done: '#1A7A4A', delayed: '#B83232',
}

interface Props {
  db: AppDB
  filterClient: string
  filterStatus: string
  zoom: ZoomLevel
  setZoom: (z: ZoomLevel) => void
  setFilterClient: (c: string) => void
  onEditProject: (id: string) => void
  onEditTask: (id: string) => void
  onNewProject: () => void
}

export function GanttView({ db, filterClient, zoom, setZoom, setFilterClient, onEditProject, onEditTask, onNewProject }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const projects = db.projects.filter(p => !filterClient || p.client_id === filterClient)
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
  const T = fmt(todayDate)

  if (!projects.length) return (
    <div>
      <div className="tbar">
        <ZoomBar zoom={zoom} setZoom={setZoom} />
        <div className="tb-r"><button className="btn bp bsm" onClick={onNewProject}>+ New project</button></div>
      </div>
      <div className="ems">No projects to show.</div>
    </div>
  )

  let minD = pd(projects[0].start_date), maxD = pd(projects[0].end_date)
  projects.forEach(p => {
    const s = pd(p.start_date), e = pd(p.end_date)
    if (s < minD) minD = s
    if (e > maxD) maxD = e
    db.tasks.filter(t => t.project_id === p.id).forEach(t => {
      const ts = pd(t.start_date), te = pd(t.end_date)
      if (ts < minD) minD = ts
      if (te > maxD) maxD = te
    })
  })

  if (zoom === '3month') {
    minD = new Date(todayDate); minD.setDate(1); minD.setDate(minD.getDate() - 7)
    maxD = new Date(minD); maxD.setMonth(maxD.getMonth() + 3); maxD.setDate(maxD.getDate() + 14)
  } else if (zoom === 'year') {
    minD = new Date(todayDate.getFullYear(), 0, 1)
    maxD = new Date(todayDate.getFullYear(), 11, 31)
  } else {
    minD.setDate(minD.getDate() - 3); maxD.setDate(maxD.getDate() + 3)
  }

  const totalDays = ddiff(minD, maxD) || 1
  const pct = (ds: string) => Math.max(0, Math.min(100, ddiff(minD, pd(ds)) / totalDays * 100))
  const bw = (s: string, e: string) => Math.max(0.4, pct(e) - pct(s))
  const tickStep = totalDays > 300 ? 60 : totalDays > 90 ? 14 : totalDays > 30 ? 7 : 1
  const tL = pct(T)

  const ticks: { left: number; label: string }[] = []
  const d = new Date(minD)
  while (d <= maxD) {
    const left = pct(fmt(d))
    const label = tickStep >= 14
      ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      : tickStep === 7 ? `W${wkn(d)}` : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    ticks.push({ left, label })
    d.setDate(d.getDate() + tickStep)
  }

  const bands: { left: number; width: number; even: boolean }[] = []
  if (zoom === '3month' || zoom === 'year') {
    const md = new Date(minD.getFullYear(), minD.getMonth(), 1)
    let tog = false
    while (md <= maxD) {
      const mx = pct(fmt(md))
      const nxt = new Date(md); nxt.setMonth(nxt.getMonth() + 1)
      bands.push({ left: mx, width: pct(fmt(nxt)) - mx, even: tog })
      tog = !tog; Object.assign(md, nxt)
      md.setFullYear(nxt.getFullYear(), nxt.getMonth(), nxt.getDate())
    }
  }

  return (
    <div>
      <div className="tbar">
        <ZoomBar zoom={zoom} setZoom={setZoom} />
        <select style={{ fontSize: 12 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">All clients</option>
          {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="tb-r"><button className="btn bp bsm" onClick={onNewProject}>+ New project</button></div>
      </div>

      <div className="tw gw">
        <div className="gi">
          {/* Header row */}
          <div className="grow" style={{ background: 'var(--sf2)' }}>
            <div className="glc hdr">Project / Task</div>
            <div className="g-hdr-ticks">
              {bands.map((b, i) => (
                <div key={i} style={{ position: 'absolute', left: `${b.left}%`, width: `${b.width}%`, top: 0, bottom: 0, background: b.even ? 'rgba(0,0,0,.025)' : 'transparent', pointerEvents: 'none' }} />
              ))}
              {ticks.map((tk, i) => (
                <div key={i} style={{ position: 'absolute', left: `${tk.left}%`, fontSize: 10, color: 'var(--tx3)', paddingTop: 5, borderLeft: '1px solid var(--bd)', paddingLeft: 3, whiteSpace: 'nowrap' }}>{tk.label}</div>
              ))}
              <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'var(--rd)', opacity: .5, left: `${tL}%` }} />
            </div>
          </div>

          {projects.map(p => {
            const isCol = !!collapsed[p.id]
            const tasks = db.tasks.filter(t => t.project_id === p.id)
            const bL = pct(p.start_date)
            const bW = bw(p.start_date, p.end_date)
            const col = clientColor(db.clients, p.client_id)
            const barCol = BAR_COL[p.status]
            return [
              <div key={p.id} className="grow" style={{ background: 'var(--sf)' }}>
                <div className="glc g-pl" style={{ cursor: 'pointer' }} onClick={() => toggle(p.id)}>
                  <span style={{ marginRight: 4, color: 'var(--tx3)', fontSize: 10 }}>{isCol ? '▶' : '▼'}</span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: col, marginRight: 5, verticalAlign: 'middle' }} />
                  {p.name}
                </div>
                <div className="gbc">
                  <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'var(--rd)', opacity: .25, left: `${tL}%`, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative', width: '100%', height: 22 }}>
                    <div
                      style={{ position: 'absolute', left: `${bL}%`, width: `${bW}%`, height: 22, background: barCol, borderRadius: 5, cursor: 'pointer', minWidth: 5, overflow: 'hidden' }}
                      onClick={() => onEditProject(p.id)}
                    >
                      <div style={{ height: '100%', width: `${p.pct}%`, background: 'rgba(255,255,255,.28)', borderRadius: '5px 0 0 5px' }} />
                      {bW > 7 && <span style={{ position: 'absolute', left: 6, right: 4, top: 0, lineHeight: '22px', fontSize: 10, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{p.name}</span>}
                    </div>
                  </div>
                </div>
              </div>,
              ...(!isCol ? tasks.map(t => {
                const tL2 = pct(t.start_date); const tW = bw(t.start_date, t.end_date); const tBC = BAR_COL[t.status]
                return (
                  <div key={t.id} className="grow">
                    <div className="glc g-tl">↪ {t.name}</div>
                    <div className="gbc">
                      <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'var(--rd)', opacity: .2, left: `${tL}%`, pointerEvents: 'none' }} />
                      <div style={{ position: 'relative', width: '100%', height: 15 }}>
                        <div style={{ position: 'absolute', left: `${tL2}%`, width: `${tW}%`, height: 15, background: tBC, borderRadius: 4, opacity: .85, cursor: 'pointer', minWidth: 4, overflow: 'hidden' }} onClick={() => onEditTask(t.id)}>
                          <div style={{ height: '100%', width: `${t.pct}%`, background: 'rgba(255,255,255,.3)', borderRadius: '4px 0 0 4px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }) : [])
            ]
          })}
        </div>
      </div>
    </div>
  )
}

function ZoomBar({ zoom, setZoom }: { zoom: ZoomLevel; setZoom: (z: ZoomLevel) => void }) {
  const ZOOMS: ZoomLevel[] = ['day', 'week', 'month', '3month', 'year']
  return (
    <div className="zg">
      {ZOOMS.map(z => <button key={z} className={`zb${zoom === z ? ' act' : ''}`} onClick={() => setZoom(z)}>{z === '3month' ? '3 Mo' : z.charAt(0).toUpperCase() + z.slice(1)}</button>)}
    </div>
  )
}
