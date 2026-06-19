'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Contact, Project } from '@/lib/types'

interface Props {
  open: boolean
  contact?: Contact | null
  projects: Project[]
  onSave: (ct: Contact) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
  toast: (msg: string) => void
}

export function ContactModal({ open, contact, projects, onSave, onDelete, onClose, toast }: Props) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (contact) {
      setName(contact.name); setRole(contact.role)
      setEmail(contact.email || ''); setPhone(contact.phone || '')
      setProjectIds(contact.projects || [])
    } else {
      setName(''); setRole(''); setEmail(''); setPhone(''); setProjectIds([])
    }
  }, [contact, open])

  async function handleSave() {
    if (!name.trim()) { toast('Contact name required.'); return }
    setSaving(true)
    await onSave({
      id: contact?.id || ('ct_' + Math.random().toString(36).slice(2, 9)),
      name: name.trim(), role: role.trim(),
      email: email.trim(), phone: phone.trim(), projects: projectIds,
    })
    setSaving(false)
  }

  function toggleProject(id: string) {
    setProjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <Modal title={contact ? 'Edit contact' : 'Add contact'} open={open} onClose={onClose}>
      <div className="fg">
        <div className="fr ff">
          <label>Contact name *</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fr ff">
          <label>Role / Title</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Project Manager" />
        </div>
        <div className="fr">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="fr">
          <label>Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        {projects.length > 0 && (
          <div className="fr ff">
            <label>Assigned projects</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {projects.map(p => (
                <span
                  key={p.id}
                  className={`cb-chip${projectIds.includes(p.id) ? ' sel' : ''}`}
                  onClick={() => toggleProject(p.id)}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="fa">
        <div>
          {contact?.id && onDelete && (
            <button className="btn bd-btn bsm" onClick={async () => { if (!confirm('Delete contact?')) return; await onDelete!(contact.id); onClose() }}>
              Delete contact
            </button>
          )}
        </div>
        <div className="fa-r">
          <button className="btn bsm" onClick={onClose}>Cancel</button>
          <button className="btn bp bsm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save contact'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
