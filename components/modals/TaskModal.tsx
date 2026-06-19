'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Task, Project, Contractor, Worker, Status } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { todayStr, dFrom } from '@/lib/utils'

interface Props {
  open: boolean
  task?: Task | null
  defaultProjectId?: string
  projects: Project[]
  contractors: Contractor[]
  workers: Worker[]
  onSave: (t: Omit<Task, 'id'> & { id?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
  toast: (msg: string) => void
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

export function TaskModal({ open, task, defaultProjectId, projects, contractors, workers, onSave, onDelete, onClose, toast }: Props) {
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(dFrom(14))
  const [status, setStatus] = useState<Status>('planning')
  const [pct, setPct] = useState(0)
  const [notes, setNotes] = useState('')
  const [workerIds, setWorkerIds] = useState<string[]>([])
  const [contractorIds, setContractorIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setName(task.name); setProjectId(task.project_id)
      setStartDate(task.start_date); setEndDate(task.end_date)
      setStatus(task.status); setPct(task.pct); setNotes(task.notes || '')
      setWorkerIds(task.worker_ids || []); setContractorIds(task.contractor_ids || [])
    } else {
      setName(''); setProjectId(defaultProjectId || projects[0]?.id || '')
      setStartDate(todayStr()); setEndDate(dFrom(14))
      setStatus('planning'); setPct(0); setNotes('')
      setWorkerIds([]); setContractorIds([])
    }
  }, [task, open, defaultProjectId, projects])

  async function handleSave() {
    if (!name.trim()) { toast('Task name required.'); return }
    if (!projectId) { toast('Project required.'); return }
    setSaving(true)
    await onSave({
      id: task?.id, name: name.trim(), project_id: projectId,
      start_date: startDate, end_date: endDate,
      status, pct: Math.min(100, Math.max(0, pct)),
      notes: notes.trim(), worker_ids: workerIds, contractor_ids: contractorIds,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!task || !onDelete) return
    if (!confirm('Delete this task?')) return
    await onDelete(task.id)
    onClose()
  }

  return (
    <Modal title={task ? 'Edit task' : 'New task'} open={open} onClose={onClose}>
      <div className="fg">
        <div className="fr ff">
          <label>Task name *</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fr ff">
          <label>Project *</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
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
        <CheckChips label="Assign workers" items={workers} selected={workerIds} onChange={setWorkerIds} />
        <CheckChips label="Assign subcontractors" items={contractors} selected={contractorIds} onChange={setContractorIds} />
        <div className="fr ff">
          <label>Notes</label>
          <textarea rows={2} style={{ width: '100%', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="fa">
        <div>
          {task && onDelete && (
            <button className="btn bd-btn bsm" onClick={handleDelete}>Delete task</button>
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
