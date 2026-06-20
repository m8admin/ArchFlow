'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Project, Client, Contractor, Worker, Status } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { todayStr, dFrom } from '@/lib/utils'

interface Props {
  open: boolean
  project?: Project | null
  clients: Client[]
  contractors: Contractor[]
  workers: Worker[]
  onSave: (p: Omit<Project, 'id'> & { id?: string }) => Promise<void>
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

export function ProjectModal({ open, project, clients, contractors, workers, onSave, onDelete, onClose, toast }: Props) {
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
  const [workerIds, setWorkerIds] = useState<string[]>([])
  const [contractorIds, setContractorIds] = useState<string[]>([])
  const [coordinatorId, setCoordinatorId] = useState<string>('')
  const [coordinatorType, setCoordinatorType] = useState<'worker' | 'contractor'>('worker')
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
      setWorkerIds(project.worker_ids || [])
      setContractorIds(project.contractor_ids || [])
      setCoordinatorId(project.coordinator_id || '')
      setCoordinatorType(project.coordinator_type || 'worker')
    } else {
      setName(''); setClientId(clients[0]?.id || ''); setNewClient('')
      setStartDate(todayStr()); setEndDate(dFrom(30))
      setStatus('planning'); setPct(0); setSqm(''); setFloors(''); setUses(''); setNotes('')
      setWorkerIds([]); setContractorIds([])
      setCoordinatorId(''); setCoordinatorType('worker')
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
      worker_ids: workerIds, contractor_ids: contractorIds,
      coordinator_id: coordinatorId || null,
      coordinator_type: coordinatorId ? coordinatorType : null,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!project || !onDelete) return
    if (!confirm('Delete this project and all its tasks?')) return
    await onDelete(project.id)
    onClose()
  }

  // Combined list for coordinator picker, grouped by type
  const coordinatorOptions = [
    ...workers.map(w => ({ id: w.id, name: w.name, type: 'worker' as const, role: w.role })),
    ...contractors.map(c => ({ id: c.id, name: c.name, type: 'contractor' as const, role: c.role })),
  ]

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

        {/* Coordinator */}
        <div className="fr ff">
          <label>Project coordinator</label>
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

        <CheckChips label="Assign workers" items={workers} selected={workerIds} onChange={setWorkerIds} />
        <CheckChips label="Assign subcontractors" items={contractors} selected={contractorIds} onChange={setContractorIds} />
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
