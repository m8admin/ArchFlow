'use client'

import { useState, useMemo } from 'react'
import type { AppDB, TimeEntry } from '@/lib/types'
import { fmtFull } from '@/lib/utils'

interface Props {
  db: AppDB
  entries: TimeEntry[]
  hoursByTask: Record<string, number>
  onNewEntry: () => void
  onEditEntry: (entry: TimeEntry) => void
}

export function TimeTrackingView({ db, entries, hoursByTask, onNewEntry, onEditEntry }: Props) {
  const [filterProject, setFilterProject] = useState('')
  const [filterWorker, setFilterWorker] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterProject) {
        const task = db.tasks.find(t => t.id === e.task_id)
        if (!task || task.project_id !== filterProject) return false
      }
      if (filterWorker) {
        if (e.worker_id !== filterWorker) return false
      }
      if (filterDateFrom && e.date < filterDateFrom) return false
      if (filterDateTo && e.date > filterDateTo) return false
      return true
    })
  }, [entries, filterProject, filterWorker, filterDateFrom, filterDateTo, db.tasks])

  const totalHours = filtered.reduce((a, e) => a + Number(e.hours), 0)
  const thisWeek = (() => {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const start = new Date(now); start.setDate(start.getDate() - start.getDay())
    const startStr = start.toISOString().split('T')[0]
    return filtered.filter(e => e.date >= startStr).reduce((a, e) => a + Number(e.hours), 0)
  })()
  const uniqueWorkers = new Set(filtered.map(e => `${e.worker_type}:${e.worker_id}`)).size

  function workerName(e: TimeEntry) {
    if (e.worker_type === 'worker') return db.workers.find(w => w.id === e.worker_id)?.name || '?'
    return db.contractors.find(c => c.id === e.worker_id)?.name || '?'
  }

  function taskInfo(e: TimeEntry) {
    const task = db.tasks.find(t => t.id === e.task_id)
    if (!task) return { taskName: '?', projectName: '?' }
    const project = db.projects.find(p => p.id === task.project_id)
    return { taskName: task.name, projectName: project?.name || '?', kind: task.kind }
  }

  // Planned vs Actual report
  const milestones = filterProject
    ? db.tasks.filter(t => t.project_id === filterProject && (t.kind || 'milestone') === 'milestone' && !t.parent_milestone_id)
    : db.tasks.filter(t => (t.kind || 'milestone') === 'milestone' && !t.parent_milestone_id)

  const milestonesWithHours = milestones.filter(m => m.modeller_hours || hoursByTask[m.id])

  return (
    <>
      <div className="pg-t">Time Tracking</div>

      {/* Stats */}
      <div className="sstrip">
        <div className="sc"><div className="sc-l">TOTAL HOURS</div><div className="sc-v">{totalHours.toFixed(1)}</div></div>
        <div className="sc"><div className="sc-l">THIS WEEK</div><div className="sc-v" style={{ color: 'var(--bl)' }}>{thisWeek.toFixed(1)}</div></div>
        <div className="sc"><div className="sc-l">ENTRIES</div><div className="sc-v">{filtered.length}</div></div>
        <div className="sc"><div className="sc-l">WORKERS</div><div className="sc-v">{uniqueWorkers}</div></div>
      </div>

      {/* Filters */}
      <div className="tbar">
        <select style={{ fontSize: 12 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All projects</option>
          {db.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ fontSize: 12 }} value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
          <option value="">All workers</option>
          {db.workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          {db.contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" style={{ fontSize: 12 }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
        <span style={{ color: 'var(--tx3)', fontSize: 12 }}>to</span>
        <input type="date" style={{ fontSize: 12 }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
        {(filterProject || filterWorker || filterDateFrom || filterDateTo) && (
          <button className="btn bxs" onClick={() => { setFilterProject(''); setFilterWorker(''); setFilterDateFrom(''); setFilterDateTo('') }}>Clear</button>
        )}
        <div className="tb-r">
          <button className="btn bp bsm" onClick={onNewEntry}>+ Log time</button>
        </div>
      </div>

      {/* Entries table */}
      <div className="tw" style={{ marginBottom: 18 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Project</th>
              <th>Milestone / Task</th>
              <th>Worker</th>
              <th>Hours</th>
              <th>Notes</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr className="er"><td colSpan={7}>No time entries{filterProject || filterWorker ? ' match filters' : ''} — <button className="btn bsm" onClick={onNewEntry}>+ Log time</button></td></tr>
            ) : filtered.map(e => {
              const { taskName, projectName, kind } = taskInfo(e)
              return (
                <tr key={e.id} className="pr" style={{ cursor: 'pointer' }} onClick={() => onEditEntry(e)}>
                  <td style={{ fontSize: 12 }}>{fmtFull(e.date)}</td>
                  <td style={{ fontSize: 12, fontWeight: 500 }}>{projectName}</td>
                  <td style={{ fontSize: 12 }}>
                    {kind === 'task' && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--bl-tx)', background: 'var(--bl-bg)', padding: '1px 5px', borderRadius: 10, marginRight: 4 }}>Task</span>}
                    {taskName}
                  </td>
                  <td style={{ fontSize: 12 }}>{workerName(e)}</td>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{Number(e.hours).toFixed(1)}</td>
                  <td style={{ fontSize: 12, color: 'var(--tx2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.notes || '—'}</td>
                  <td><button className="bi" onClick={ev => { ev.stopPropagation(); onEditEntry(e) }}>✎</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Planned vs Actual */}
      {milestonesWithHours.length > 0 && (
        <>
          <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Planned vs Actual Hours</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Milestone</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Variance</th>
                  <th style={{ minWidth: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {milestonesWithHours.map(m => {
                  const project = db.projects.find(p => p.id === m.project_id)
                  const planned = m.modeller_hours || 0
                  const actual = hoursByTask[m.id] || 0
                  const variance = actual - planned
                  const pct = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0
                  const overBudget = planned > 0 && actual > planned
                  return (
                    <tr key={m.id}>
                      <td style={{ fontSize: 12, fontWeight: 500 }}>{project?.name || '?'}</td>
                      <td style={{ fontSize: 12 }}>{m.name}</td>
                      <td style={{ fontSize: 12 }}>{planned ? `${planned}h` : '—'}</td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{actual.toFixed(1)}h</td>
                      <td style={{ fontSize: 12, fontWeight: 600, color: overBudget ? 'var(--rd)' : variance < 0 ? 'var(--gn)' : 'var(--tx3)' }}>
                        {planned ? `${variance > 0 ? '+' : ''}${variance.toFixed(1)}h` : '—'}
                      </td>
                      <td>
                        <div style={{ background: 'var(--sf2)', height: 8, borderRadius: 20, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, background: overBudget ? 'var(--rd)' : 'var(--bl)' }} />
                        </div>
                      </td>
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
