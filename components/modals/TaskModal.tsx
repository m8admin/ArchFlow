'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Task, Project, Contractor, Worker, Status, SubTask } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { todayStr, dFrom } from '@/lib/utils'

interface Props {
  open: boolean
  task?: Task | null
  mode: 'milestone' | 'task'
  defaultProjectId?: string
  defaultMilestoneId?: string
  projects: Project[]
  milestones: Task[]
  contractors: Contractor[]
  workers: Worker[]
  onSave: (t: Omit<Task, 'id'> & { id?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
  toast: (msg: string) => void
  isAdmin?: boolean
}

function CheckChips({ label, items, selected, onChange }: { label: string; items: { id: string; name: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  if (!items.length) return null
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  return (
    <div className="fr ff">
      <label>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
        {items.map(item => (
          <span key={item.id} className={`cb-chip${selected.includes(item.id) ? ' sel' : ''}`} onClick={() => toggle(item.id)}>
            {item.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TaskModal({ open, task, mode, defaultProjectId, defaultMilestoneId, projects, milestones, contractors, workers, onSave, onDelete, onClose, toast, isAdmin }: Props) {
  const isMilestone = mode === 'milestone'
  const label = isMilestone ? 'Milestone' : 'Task'

  const [name, setName] = useState('')
  const [phase, setPhase] = useState('')
  const [projectId, setProjectId] = useState('')
  const [parentMilestoneId, setParentMilestoneId] = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(dFrom(14))
  const [status, setStatus] = useState<Status>('planning')
  const [pct, setPct] = useState(0)
  const [notes, setNotes] = useState('')
  const [pinpoints, setPinpoints] = useState<SubTask[]>([{ text: '', done: false }])
  const [coordinatorId, setCoordinatorId] = useState<string>('')
  const [coordinatorType, setCoordinatorType] = useState<'worker' | 'contractor'>('worker')
  const [modellerWorkerIds, setModellerWorkerIds] = useState<string[]>([])
  const [modellerContractorIds, setModellerContractorIds] = useState<string[]>([])
  const [modellerHours, setModellerHours] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setName(task.name); setPhase(task.phase || ''); setProjectId(task.project_id)
      setParentMilestoneId(task.parent_milestone_id || '')
      setStartDate(task.start_date); setEndDate(task.end_date)
      setStatus(task.status); setPct(task.pct); setNotes(task.notes || '')
      setPinpoints(task.pinpoints?.length ? task.pinpoints.map(p => typeof p === 'string' ? { text: p, done: false } : p) : [{ text: '', done: false }])
      setCoordinatorId(task.coordinator_id || '')
      setCoordinatorType(task.coordinator_type || 'worker')
      setModellerWorkerIds(task.modeller_worker_ids || [])
      setModellerContractorIds(task.modeller_contractor_ids || [])
      setModellerHours(task.modeller_hours ? String(task.modeller_hours) : '')
    } else {
      setName(''); setPhase(''); setProjectId(defaultProjectId || projects[0]?.id || '')
      setParentMilestoneId(defaultMilestoneId || '')
      setStartDate(todayStr()); setEndDate(dFrom(14))
      setStatus('planning'); setPct(0); setNotes('')
      setPinpoints([{ text: '', done: false }])
      setCoordinatorId(''); setCoordinatorType('worker')
      setModellerWorkerIds([]); setModellerContractorIds([])
      setModellerHours('')
    }
  }, [task, open, defaultProjectId, defaultMilestoneId, projects])

  const availableMilestones = milestones.filter(m => m.project_id === projectId && m.kind === 'milestone')

  async function handleSave() {
    if (!name.trim()) { toast(`${label} name required.`); return }
    if (!projectId) { toast('Project required.'); return }
    setSaving(true)
    await onSave({
      id: task?.id, name: name.trim(), project_id: projectId,
      kind: isMilestone ? 'milestone' as const : 'task' as const,
      phase: phase.trim().toUpperCase(),
      parent_milestone_id: isMilestone ? null : (parentMilestoneId || null),
      start_date: startDate, end_date: endDate,
      status, pct: Math.min(100, Math.max(0, pct)),
      notes: notes.trim(),
      pinpoints: pinpoints.filter(p => p.text.trim()),
      coordinator_id: coordinatorId || null,
      coordinator_type: coordinatorId ? coordinatorType : null,
      modeller_worker_ids: modellerWorkerIds,
      modeller_contractor_ids: modellerContractorIds,
      modeller_hours: isMilestone && modellerHours ? parseFloat(modellerHours) : null,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!task || !onDelete) return
    if (!confirm(`Delete this ${label.toLowerCase()}?`)) return
    await onDelete(task.id)
    onClose()
  }

  return (
    <Modal title={task ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`} open={open} onClose={onClose}>
      <div className="fg">
        <div className="fr ff">
          <label>{label} name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={isMilestone ? 'e.g. Tender drawings, Construction drawings' : ''} />
        </div>
        {isMilestone && (
          <div className="fr">
            <label>Phase</label>
            <input value={phase} onChange={e => setPhase(e.target.value)} placeholder="e.g. A, B, C" style={{ width: 60, textTransform: 'uppercase' }} />
          </div>
        )}
        <div className="fr ff">
          <label>Project *</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Task: optionally link to a milestone */}
        {!isMilestone && (
          <div className="fr ff">
            <label>Under milestone (optional)</label>
            <select value={parentMilestoneId} onChange={e => setParentMilestoneId(e.target.value)}>
              <option value="">— Directly under project —</option>
              {availableMilestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        <div className="fr">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="fr">
          <label>Deadline</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="fr">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as Status)}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="fr">
          <label>Progress (%)</label>
          <input type="number" min={0} max={100} value={pct} onChange={e => setPct(parseInt(e.target.value) || 0)} />
        </div>

        {/* Modeller hours - milestones only, admin only */}
        {isMilestone && isAdmin && (
          <div className="fr ff">
            <label>Total modeller hours</label>
            <input type="number" min={0} step="0.5" value={modellerHours} onChange={e => setModellerHours(e.target.value)} placeholder="e.g. 120" />
          </div>
        )}

        <div className="sect-divider">Assignments</div>

        <div className="fr ff">
          <label>Coordinator (Project Manager)</label>
          <select
            value={coordinatorId ? `${coordinatorType}:${coordinatorId}` : ''}
            onChange={e => {
              const val = e.target.value
              if (!val) { setCoordinatorId(''); return }
              const [type, id] = val.split(':')
              setCoordinatorType(type as 'worker' | 'contractor')
              setCoordinatorId(id)
            }}
          >
            <option value="">— None —</option>
            {workers.length > 0 && <option disabled>── Workers ──</option>}
            {workers.map(w => (
              <option key={w.id} value={`worker:${w.id}`}>{w.name}{w.role ? ` (${w.role})` : ''}</option>
            ))}
            {contractors.length > 0 && <option disabled>── Subcontractors ──</option>}
            {contractors.map(c => (
              <option key={c.id} value={`contractor:${c.id}`}>{c.name}{c.role ? ` (${c.role})` : ''}</option>
            ))}
          </select>
        </div>

        <CheckChips label="Modellers (Workers)" items={workers} selected={modellerWorkerIds} onChange={setModellerWorkerIds} />
        <CheckChips label="Modellers (Subcontractors)" items={contractors} selected={modellerContractorIds} onChange={setModellerContractorIds} />

        <div className="sect-divider">Sub-Tasks</div>
        <div className="fr ff">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pinpoints.map((pp, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', minWidth: 22, textAlign: 'right' }}>{i + 1}.</span>
                <button
                  type="button"
                  onClick={() => { const a = [...pinpoints]; a[i] = { ...a[i], done: !a[i].done }; setPinpoints(a) }}
                  style={{
                    width: 20, height: 20, borderRadius: 4, border: '2px solid',
                    borderColor: pp.done ? 'var(--gn)' : 'var(--bd2)',
                    background: pp.done ? 'var(--gn-bg)' : 'var(--sf)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: 'var(--gn)', flexShrink: 0,
                  }}
                >{pp.done ? '✓' : ''}</button>
                <input
                  style={{ flex: 1, textDecoration: pp.done ? 'line-through' : 'none', color: pp.done ? 'var(--tx3)' : 'var(--tx)' }}
                  value={pp.text}
                  onChange={e => { const a = [...pinpoints]; a[i] = { ...a[i], text: e.target.value }; setPinpoints(a) }}
                  placeholder={`Sub-task ${i + 1}`}
                />
                {pinpoints.length > 1 && (
                  <button type="button" className="bi bxs" onClick={() => setPinpoints(pinpoints.filter((_, j) => j !== i))}>−</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn bxs" style={{ marginTop: 5, width: 'fit-content' }} onClick={() => setPinpoints([...pinpoints, { text: '', done: false }])}>+ Add sub-task</button>
        </div>
        <div className="fr ff">
          <label>Notes</label>
          <textarea rows={2} style={{ width: '100%', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="fa">
        <div>
          {task && onDelete && (
            <button className="btn bd-btn bsm" onClick={handleDelete}>Delete {label.toLowerCase()}</button>
          )}
        </div>
        <div className="fa-r">
          <button className="btn bsm" onClick={onClose}>Cancel</button>
          <button className="btn bp bsm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
