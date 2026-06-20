'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Client, Contractor, Worker, DirType } from '@/lib/types'
import { CLIENT_COLORS } from '@/lib/utils'

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

const PRESET_COLORS = [
  ...CLIENT_COLORS,
  '#E91E63', '#00BCD4', '#FF9800', '#4CAF50', '#9C27B0',
  '#3F51B5', '#009688', '#FF5722', '#607D8B', '#795548',
]

const TITLES: Record<DirType, string> = { client: 'Client', contractor: 'Subcontractor', worker: 'Worker' }
const ROLE_PH: Record<DirType, string> = { client: 'e.g. Developer', contractor: 'e.g. 3D Visualisation', worker: 'e.g. Senior Architect' }

export function DirModal({ open, type, item, onSave, onDelete, onClose, toast }: Props) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState<string[]>([''])
  const [phone, setPhone] = useState<string[]>([''])
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name); setRole(item.role || '')
      setEmail((item.email || []).length ? item.email : [''])
      setPhone((item.phone || []).length ? item.phone : [''])
      setNotes(item.notes || '')
      setColor((item as Client).color || '')
    } else {
      setName(''); setRole(''); setEmail(['']); setPhone(['']); setNotes(''); setColor('')
    }
  }, [item, open])

  async function handleSave() {
    if (!name.trim()) { toast('Name is required.'); return }
    setSaving(true)
    const payload: Record<string, unknown> = {
      ...(item || {}),
      id: item?.id,
      name: name.trim(), role: role.trim(),
      email: email.filter(Boolean), phone: phone.filter(Boolean),
      notes: notes.trim(),
    }
    if (type === 'client') {
      payload.color = color || null
      payload.contacts = (item as Client)?.contacts || []
    } else if (type === 'contractor') {
      payload.contacts = (item as Contractor)?.contacts || []
    }
    await onSave(payload as DirItem & { id?: string })
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

        {/* Color picker - clients only */}
        {type === 'client' && (
          <div className="fr ff">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {PRESET_COLORS.map(c => (
                <span
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: color === c ? '3px solid var(--tx)' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 0 2px var(--sf)' : 'none',
                  }}
                />
              ))}
              <input
                type="color"
                value={color || '#2B6BE8'}
                onChange={e => setColor(e.target.value)}
                style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer' }}
                title="Custom color"
              />
              {color && (
                <button className="btn bxs" onClick={() => setColor('')} style={{ fontSize: 11 }}>Clear</button>
              )}
            </div>
          </div>
        )}

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
