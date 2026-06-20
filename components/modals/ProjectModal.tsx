'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Project, Client } from '@/lib/types'

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
  const [sqm, setSqm] = useState('')
  const [floors, setFloors] = useState('')
  const [uses, setUses] = useState('')
  const [developer, setDeveloper] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setClientId(project.client_id)
      setNewClient('')
      setSqm(project.sqm ? String(project.sqm) : '')
      setFloors(project.floors ? String(project.floors) : '')
      setUses(project.uses || '')
      setDeveloper(project.developer || '')
      setNotes(project.notes || '')
    } else {
      setName(''); setClientId(clients[0]?.id || ''); setNewClient('')
      setSqm(''); setFloors(''); setUses(''); setDeveloper(''); setNotes('')
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
      sqm: sqm ? parseInt(sqm) : null,
      floors: floors ? parseInt(floors) : null,
      uses: uses.trim(), developer: developer.trim(), notes: notes.trim(),
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
          <label>Construction Developer</label>
          <input value={developer} onChange={e => setDeveloper(e.target.value)} placeholder="e.g. Skyline Developers" />
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
