'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { TimeEntry, Project, Task, Worker, Contractor } from '@/lib/types'
import { todayStr } from '@/lib/utils'

interface Props {
  open: boolean
  entry?: TimeEntry | null
  projects: Project[]
  tasks: Task[]
  workers: Worker[]
  contractors: Contractor[]
  onSave: (data: Omit<TimeEntry, 'id'> & { id?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
  toast: (msg: string) => void
}

export function TimeEntryModal({ open, entry, projects, tasks, workers, contractors, onSave, onDelete, onClose, toast }: Props) {
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [workerId, setWorkerId] = useState('')
  const [workerType, setWorkerType] = useState<'worker' | 'contractor'>('worker')
  const [hours, setHours] = useState('')
  const [date, setDate] = useState(todayStr())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      const task = tasks.find(t => t.id === entry.task_id)
      setProjectId(task?.project_id || '')
      setTaskId(entry.task_id)
      setWorkerId(entry.worker_id)
      setWorkerType(entry.worker_type)
      setHours(String(entry.hours))
      setDate(entry.date)
      setNotes(entry.notes || '')
    } else {
      setProjectId(projects[0]?.id || '')
      setTaskId(''); setWorkerId(''); setWorkerType('worker')
      setHours(''); setDate(todayStr()); setNotes('')
    }
  }, [entry, open, projects, tasks])

  const projectTasks = tasks.filter(t => t.project_id === projectId)
  const milestones = projectTasks.filter(t => (t.kind || 'milestone') === 'milestone' && !t.parent_milestone_id)

  async function handleSave() {
    if (!taskId) { toast('Select a milestone or task.'); return }
    if (!workerId) { toast('Select a worker.'); return }
    const h = parseFloat(hours)
    if (!h || h <= 0) { toast('Hours must be greater than 0.'); return }
    setSaving(true)
    await onSave({
      id: entry?.id,
      task_id: taskId,
      worker_id: workerId,
      worker_type: workerType,
      hours: h,
      date,
      notes: notes.trim(),
    })
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!entry || !onDelete) return
    if (!confirm('Delete this time entry?')) return
    await onDelete(entry.id)
    onClose()
  }

  return (
    <Modal title={entry ? 'Edit time entry' : 'Log time'} open={open} onClose={onClose}>
      <div className="fg">
        <div className="fr ff">
          <label>Project *</label>
          <select value={projectId} onChange={e => { setProjectId(e.target.value); setTaskId('') }}>
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="fr ff">
          <label>Milestone / Task *</label>
          <select value={taskId} onChange={e => setTaskId(e.target.value)}>
            <option value="">— Select —</option>
            {milestones.map(m => {
              const subtasks = projectTasks.filter(t => t.parent_milestone_id === m.id)
              return [
                <option key={m.id} value={m.id}>📌 {m.name}</option>,
                ...subtasks.map(st => (
                  <option key={st.id} value={st.id}>&nbsp;&nbsp;&nbsp;↪ {st.name}</option>
                ))
              ]
            })}
            {/* Project-level tasks */}
            {projectTasks.filter(t => t.kind === 'task' && !t.parent_milestone_id).map(t => (
              <option key={t.id} value={t.id}>📋 {t.name}</option>
            ))}
          </select>
        </div>
        <div className="fr ff">
          <label>Worker *</label>
          <select
            value={workerId ? `${workerType}:${workerId}` : ''}
            onChange={e => {
              const val = e.target.value
              if (!val) { setWorkerId(''); return }
              const [type, id] = val.split(':')
              setWorkerType(type as 'worker' | 'contractor')
              setWorkerId(id)
            }}
          >
            <option value="">— Select —</option>
            {workers.length > 0 && <option disabled>── Workers ──</option>}
            {workers.map(w => <option key={w.id} value={`worker:${w.id}`}>{w.name}</option>)}
            {contractors.length > 0 && <option disabled>── Subcontractors ──</option>}
            {contractors.map(c => <option key={c.id} value={`contractor:${c.id}`}>{c.name}</option>)}
          </select>
        </div>
        <div className="fr">
          <label>Hours *</label>
          <input type="number" min={0.25} step={0.25} value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 4.5" />
        </div>
        <div className="fr">
          <label>Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="fr ff">
          <label>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was done" />
        </div>
      </div>
      <div className="fa">
        <div>
          {entry && onDelete && (
            <button className="btn bd-btn bsm" onClick={handleDelete}>Delete</button>
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
