'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Badge'
import type { AppDB, TimeEntry, ScopeBuilding, ScopeFloor, BudgetItem, PaymentMilestone, Project } from '@/lib/types'
import { fmtFull, clientColor, projectAggregates } from '@/lib/utils'
import { BudgetView } from './BudgetView'

interface Props {
  db: AppDB
  projectId: string
  entries: TimeEntry[]
  hoursByTask: Record<string, number>
  onBack: () => void
  onLogTime: (taskId?: string) => void
  onEditEntry: (entry: TimeEntry) => void
  onEditMilestone: (id: string) => void
  // Budget props
  buildings: ScopeBuilding[]
  floors: ScopeFloor[]
  costItems: BudgetItem[]
  payments: PaymentMilestone[]
  onUpdateProject: (data: Partial<Project>) => Promise<void>
  onAddBuilding: (name: string) => Promise<void>
  onUpdateBuilding: (id: string, data: Partial<ScopeBuilding>) => Promise<void>
  onDeleteBuilding: (id: string) => Promise<void>
  onAddFloor: (buildingId: string) => Promise<void>
  onUpdateFloor: (id: string, data: Partial<ScopeFloor>) => Promise<void>
  onDeleteFloor: (id: string) => Promise<void>
  onAddCostItem: () => Promise<void>
  onUpdateCostItem: (id: string, data: Partial<BudgetItem>) => Promise<void>
  onDeleteCostItem: (id: string) => Promise<void>
  onAddPayment: () => Promise<void>
  onUpdatePayment: (id: string, data: Partial<PaymentMilestone>) => Promise<void>
  onDeletePayment: (id: string) => Promise<void>
  onImportScope: (data: {
    buildings: { name: string; floors: { type_name: string; floor_label: string; typical_floors: number; floor_count: number; typical_sqm: number; phase_a_hours: number; phase_b_hours: number; notes: string }[] }[]
    budgetItems?: { description: string; rate: number; planned_hours: number; multiplier: number; notes: string; category: string }[]
    clientFee?: number
    vatRate?: number
    paymentItems?: { name: string; percentage: number }[]
  }) => Promise<void>
}

export function ProjectMgmtView({ db, projectId, entries, hoursByTask, onBack, onLogTime, onEditEntry, onEditMilestone, buildings, floors, costItems, payments, onUpdateProject, onAddBuilding, onUpdateBuilding, onDeleteBuilding, onAddFloor, onUpdateFloor, onDeleteFloor, onAddCostItem, onUpdateCostItem, onDeleteCostItem, onAddPayment, onUpdatePayment, onDeletePayment, onImportScope }: Props) {
  const [tab, setTab] = useState<'time' | 'budget'>('time')
  const project = db.projects.find(p => p.id === projectId)
  if (!project) return <div className="ems">Project not found.</div>

  const allTasks = db.tasks.filter(t => t.project_id === projectId)
  const milestones = allTasks.filter(t => (t.kind || 'milestone') === 'milestone' && !t.parent_milestone_id)
  const agg = projectAggregates(allTasks)
  const client = db.clients.find(c => c.id === project.client_id)
  const col = clientColor(db.clients, project.client_id)

  const projectEntries = entries.filter(e => {
    const task = db.tasks.find(t => t.id === e.task_id)
    return task && task.project_id === projectId
  })

  const totalPlanned = milestones.reduce((a, m) => a + (m.modeller_hours || 0), 0)
  const totalActual = projectEntries.reduce((a, e) => a + Number(e.hours), 0)

  function workerName(e: TimeEntry) {
    if (e.worker_type === 'worker') return db.workers.find(w => w.id === e.worker_id)?.name || '?'
    return db.contractors.find(c => c.id === e.worker_id)?.name || '?'
  }

  function taskName(taskId: string) {
    return db.tasks.find(t => t.id === taskId)?.name || '?'
  }

  return (
    <>
      <div className="back" onClick={onBack}>← Back to projects</div>

      {/* Project header */}
      <div className="p-hdr">
        <div className="p-av" style={{ background: col }}>{project.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
        <div style={{ flex: 1 }}>
          <div className="p-name">{project.name}</div>
          <div className="p-role">{client?.name || '?'} {project.city ? `· ${project.city}` : ''}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Badge status={agg.status} />
            <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{agg.pct}% complete</span>
            {agg.start && <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{fmtFull(agg.start)} → {fmtFull(agg.end)}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="zg" style={{ marginBottom: 16 }}>
        <button className={`zb${tab === 'time' ? ' act' : ''}`} onClick={() => setTab('time')}>Time Tracking</button>
        <button className={`zb${tab === 'budget' ? ' act' : ''}`} onClick={() => setTab('budget')}>Budget</button>
      </div>

      {tab === 'time' ? (
        <>
          {/* Hours summary */}
          <div className="sstrip">
            <div className="sc"><div className="sc-l">PLANNED HOURS</div><div className="sc-v">{totalPlanned || '—'}</div></div>
            <div className="sc"><div className="sc-l">ACTUAL HOURS</div><div className="sc-v" style={{ color: 'var(--bl)' }}>{totalActual.toFixed(1)}</div></div>
            <div className="sc"><div className="sc-l">VARIANCE</div><div className="sc-v" style={{ color: totalPlanned && (totalActual - totalPlanned) > 0 ? 'var(--rd)' : (totalActual - totalPlanned) < 0 ? 'var(--gn)' : 'var(--tx3)' }}>{totalPlanned ? `${(totalActual - totalPlanned) > 0 ? '+' : ''}${(totalActual - totalPlanned).toFixed(1)}h` : '—'}</div></div>
            <div className="sc"><div className="sc-l">MILESTONES</div><div className="sc-v">{milestones.length}</div></div>
            <div className="sc"><div className="sc-l">TIME ENTRIES</div><div className="sc-v">{projectEntries.length}</div></div>
          </div>

          {/* Milestones breakdown */}
          <div className="sec-t" style={{ fontSize: 14, fontWeight: 700 }}>Milestones — Planned vs Actual</div>
          <div className="tw" style={{ marginBottom: 18 }}>
            <table>
              <thead>
                <tr><th>Milestone</th><th>Status</th><th>Progress</th><th>Planned</th><th>Actual</th><th>Variance</th><th style={{ minWidth: 120 }}></th><th style={{ width: 80 }}></th></tr>
              </thead>
              <tbody>
                {!milestones.length ? (
                  <tr className="er"><td colSpan={8}>No milestones yet.</td></tr>
                ) : milestones.map(m => {
                  const planned = m.modeller_hours || 0
                  const actual = hoursByTask[m.id] || 0
                  const variance = actual - planned
                  const pct = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0
                  const over = planned > 0 && actual > planned
                  return (
                    <tr key={m.id} className="pr">
                      <td style={{ fontWeight: 500 }}>{m.phase && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pu)', background: 'var(--pu-bg)', padding: '2px 8px', borderRadius: 12, marginRight: 6 }}>{m.phase}</span>}<span className="pnc" onClick={() => onEditMilestone(m.id)}>{m.name}</span></td>
                      <td><Badge status={m.status} /></td>
                      <td><ProgressBar status={m.status} pct={m.pct} /></td>
                      <td style={{ fontSize: 12 }}>{planned ? `${planned}h` : '—'}</td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{actual.toFixed(1)}h</td>
                      <td style={{ fontSize: 12, fontWeight: 600, color: over ? 'var(--rd)' : variance < 0 ? 'var(--gn)' : 'var(--tx3)' }}>{planned ? `${variance > 0 ? '+' : ''}${variance.toFixed(1)}h` : '—'}</td>
                      <td><div style={{ background: 'var(--sf2)', height: 8, borderRadius: 20, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, background: over ? 'var(--rd)' : 'var(--bl)' }} /></div></td>
                      <td><button className="btn bxs" onClick={() => onLogTime(m.id)}>+ Log</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Time entries */}
          <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            Time Entries
            <button className="btn bp bxs" onClick={() => onLogTime()}>+ Log time</button>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Date</th><th>Milestone / Task</th><th>Worker</th><th>Hours</th><th>Notes</th><th style={{ width: 44 }}></th></tr></thead>
              <tbody>
                {!projectEntries.length ? (
                  <tr className="er"><td colSpan={6}>No time logged yet — <button className="btn bsm" onClick={() => onLogTime()}>+ Log time</button></td></tr>
                ) : projectEntries.map(e => (
                  <tr key={e.id} className="pr" style={{ cursor: 'pointer' }} onClick={() => onEditEntry(e)}>
                    <td style={{ fontSize: 12 }}>{fmtFull(e.date)}</td>
                    <td style={{ fontSize: 12 }}>{taskName(e.task_id)}</td>
                    <td style={{ fontSize: 12 }}>{workerName(e)}</td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{Number(e.hours).toFixed(1)}</td>
                    <td style={{ fontSize: 12, color: 'var(--tx2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.notes || '—'}</td>
                    <td><button className="bi" onClick={ev => { ev.stopPropagation(); onEditEntry(e) }}>✎</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <BudgetView
          project={project}
          buildings={buildings} floors={floors} costItems={costItems} payments={payments}
          onUpdateProject={onUpdateProject}
          onAddBuilding={onAddBuilding} onUpdateBuilding={onUpdateBuilding} onDeleteBuilding={onDeleteBuilding}
          onAddFloor={onAddFloor} onUpdateFloor={onUpdateFloor} onDeleteFloor={onDeleteFloor}
          onAddCostItem={onAddCostItem} onUpdateCostItem={onUpdateCostItem} onDeleteCostItem={onDeleteCostItem}
          onAddPayment={onAddPayment} onUpdatePayment={onUpdatePayment} onDeletePayment={onDeletePayment}
          milestones={milestones} hoursByTask={hoursByTask}
          onImportScope={onImportScope}
        />
      )}
    </>
  )
}
