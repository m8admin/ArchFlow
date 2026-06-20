'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Project, Client, Status } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { todayStr, dFrom } from '@/lib/utils'

interface Props {
  open: boolean
  project?: Project | null
  clients: Client[]
  onSave: (p: Omit<Project, 'id'> & { id?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
  toast: (msg: string) => void
}

export function ProjectModal({ open, project, clients, onSave, onDelete, onClose, toast }: Props) {
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [newClient, setNewClient] = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(dFrom(30))
  const [status, setStatus] = useState<Status>('planning')
  const [pct, setPct] = useState(0)
  const [sqm, setSqm] = useState('')
  const [floors, setFloors] = useState('')
  const [uses, setUses] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setClientId(project.client_id)
      setNewClient('')
      setStartDate(project.start_date)
      setEndDate(project.end_date)
      setStatus(project.status)
      setPct(project.pct)
      setSqm(project.sqm ? String(project.sqm) : '')
      setFloors(project.floors ? String(project.floors) : '')
      setUses(project.uses || '')
      setNotes(project.notes || '')
    } else {
      setName(''); setClientId(clients[0]?.id || ''); setNewClient('')
      setStartDate(todayStr()); setEndDate(dFrom(30))
      setStatus('planning'); setPct(0); setSqm(''); setFloors(''); setUses(''); setNotes('')
    }
  }, [project, open, clients])

  async function handleSave() {
    if (!name.trim()) { toast('Project name required.'); return }
    let cid = clientId
    if (newClient.trim()) cid = '__new:' + newClient.trim()
    if (!cid) { toast('Client required.'); return }
    setSaving(true)
    await onSave({
      id: project?.id,
      name: name.trim(), client_id: cid,
      start_date: startDate, end_date: endDate,
      status, pct: Math.min(100, Math.max(0, pct)),
      sqm: sqm ? parseInt(sqm) : null,
      floors: floors ? parseInt(floors) : null,
      uses: uses.trim(), notes: notes.trim(),
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!project || !onDelete) return
    if (!confirm('Delete this project and all its milestones?')) return
    await onDelete(project.id)
    onClose()
  }

  return (
    <Modal title={project ? 'Edit project' : 'New project'} open={open} onClose={onClose}>
      <div className="fg">
        <div className="fr ff">
          <label>Project name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tower Block Drawings" />
        </div>
        <div className="fr ff">
          <label>Client *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ flex: 1 }} value={clientId} onChange={e => setClientId(e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new">+ New client…</option>
            </select>
            {(clientId === '__new' || newClient) && (
              <input style={{ flex: 1 }} placeholder="New client name" value={newClient} onChange={e => setNewClient(e.target.value)} />
            )}
          </div>
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

        <div className="sect-divider">Project Details</div>
        <div className="fr">
          <label>Typical sqm (m²)</label>
          <input type="number" min={0} value={sqm} onChange={e => setSqm(e.target.value)} placeholder="e.g. 4800" />
        </div>
        <div className="fr">
          <label>Number of typical floors</label>
          <input type="number" min={0} value={floors} onChange={e => setFloors(e.target.value)} placeholder="e.g. 12" />
        </div>
        <div className="fr ff">
          <label>Uses in project</label>
          <input value={uses} onChange={e => setUses(e.target.value)} placeholder="e.g. Residential, Commercial" />
        </div>
        <div className="fr ff">
          <label>Notes</label>
          <textarea rows={2} style={{ width: '100%', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="fa">
        <div>
          {project && onDelete && (
            <button className="btn bd-btn bsm" onClick={handleDelete}>Delete project</button>
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
