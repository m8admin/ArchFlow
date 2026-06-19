'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Client, Contractor, Worker, DirType } from '@/lib/types'

type DirItem = Client | Contractor | Worker

interface Props {
  open: boolean
  type: DirType
  item?: DirItem | null
  onSave: (data: DirItem & { id?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
  toast: (msg: string) => void
}

function MultiInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const rows = values.length ? values : ['']
  const update = (i: number, v: string) => { const a = [...rows]; a[i] = v; onChange(a.filter((x, j) => x || j < a.length - 1)) }
  const add = () => onChange([...rows, ''])
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i))
  return (
    <div className="fr ff">
      <label>{label}</label>
      <div className="mi-w">
        {rows.map((v, i) => (
          <div className="mi-r" key={i}>
            <input value={v} onChange={e => update(i, e.target.value)} placeholder={label} />
            <button type="button" className="bi bxs" onClick={() => remove(i)}>−</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn bxs" style={{ marginTop: 5, width: 'fit-content' }} onClick={add}>+ Add</button>
    </div>
  )
}

const TITLES: Record<DirType, string> = { client: 'Client', contractor: 'Subcontractor', worker: 'Worker' }
const ROLE_PH: Record<DirType, string> = { client: 'e.g. Developer', contractor: 'e.g. 3D Visualisation', worker: 'e.g. Senior Architect' }

export function DirModal({ open, type, item, onSave, onDelete, onClose, toast }: Props) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState<string[]>([''])
  const [phone, setPhone] = useState<string[]>([''])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name); setRole(item.role || '')
      setEmail((item.email || []).length ? item.email : [''])
      setPhone((item.phone || []).length ? item.phone : [''])
      setNotes(item.notes || '')
    } else {
      setName(''); setRole(''); setEmail(['']); setPhone(['']); setNotes('')
    }
  }, [item, open])

  async function handleSave() {
    if (!name.trim()) { toast('Name is required.'); return }
    setSaving(true)
    const contacts = (item as Client | Contractor)?.contacts || []
    await onSave({
      ...(item || {}),
      id: item?.id,
      name: name.trim(), role: role.trim(),
      email: email.filter(Boolean), phone: phone.filter(Boolean),
      notes: notes.trim(),
      contacts,
    } as DirItem & { id?: string })
    setSaving(false)
  }

  async function handleDelete() {
    if (!item?.id || !onDelete) return
    if (!confirm('Delete this entry?')) return
    await onDelete(item.id)
    onClose()
  }

  const title = TITLES[type]

  return (
    <Modal title={item ? `Edit ${title}` : `Add ${title}`} open={open} onClose={onClose}>
      <div className="fg">
        <div className="fr ff">
          <label>Full name *</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fr ff">
          <label>Role / Title</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder={ROLE_PH[type]} />
        </div>
        <MultiInput label="Email" values={email} onChange={setEmail} />
        <MultiInput label="Phone" values={phone} onChange={setPhone} />
        <div className="fr ff">
          <label>Notes</label>
          <textarea rows={2} style={{ width: '100%', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="fa">
        <div>
          {item?.id && onDelete && (
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
