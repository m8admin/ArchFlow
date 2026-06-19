'use client'

import { useState, useCallback } from 'react'
import { useAppData } from '@/hooks/useAppData'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { BoardView } from '@/components/views/BoardView'
import { GanttView } from '@/components/views/GanttView'
import { SubView } from '@/components/views/SubView'
import { DirectoryView } from '@/components/views/DirectoryView'
import { ProfileView } from '@/components/views/ProfileView'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { TaskModal } from '@/components/modals/TaskModal'
import { DirModal } from '@/components/modals/DirModal'
import { ContactModal } from '@/components/modals/ContactModal'
import { createClient } from '@/lib/supabase/client'
import type { ViewName, ZoomLevel, DirType, ProfileView as PV, Project, Task, Client, Contractor, Worker, Contact } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { clientColor } from '@/lib/utils'

// Export helpers
import { doCSV, doExcel, doPrint } from '@/lib/export'

type ModalState =
  | { kind: 'none' }
  | { kind: 'project'; project?: Project }
  | { kind: 'task'; task?: Task; projectId?: string }
  | { kind: 'dir'; type: DirType; item?: Client | Contractor | Worker }
  | { kind: 'contact'; parentId: string; contact?: Contact }

export default function AppShell() {
  const { db, loading, saveProject, deleteProject, saveTask, deleteTask, saveDirEntry, deleteDirEntry, fetchAll } = useAppData()
  const { toasts, toast } = useToast()
  const supabase = createClient()

  const [view, setView] = useState<ViewName>('board')
  const [profile, setProfile] = useState<PV | null>(null)
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [zoom, setZoom] = useState<ZoomLevel>('week')
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [exportOpen, setExportOpen] = useState(false)

  const goView = (v: ViewName) => { setView(v); setProfile(null) }

  // ── Project save (handles inline new client) ────────────────────────────────
  async function handleSaveProject(data: Omit<Project, 'id'> & { id?: string }) {
    let clientId = data.client_id
    if (clientId.startsWith('__new:')) {
      const newName = clientId.slice(6)
      const { data: nc } = await supabase.from('clients').insert({ name: newName, role: '', email: [], phone: [], notes: '', contacts: [] }).select().single()
      if (nc) clientId = nc.id
    }
    await saveProject({ ...data, client_id: clientId })
    setModal({ kind: 'none' })
    toast(data.id ? 'Project updated' : 'Project added')
  }

  async function handleDeleteProject(id: string) {
    await deleteProject(id)
    setModal({ kind: 'none' })
    toast('Project deleted')
    if (profile?.id === id) setProfile(null)
  }

  // ── Task save ───────────────────────────────────────────────────────────────
  async function handleSaveTask(data: Omit<Task, 'id'> & { id?: string }) {
    await saveTask(data)
    setModal({ kind: 'none' })
    toast(data.id ? 'Task updated' : 'Task added')
  }

  async function handleDeleteTask(id: string) {
    await deleteTask(id)
    setModal({ kind: 'none' })
    toast('Task deleted')
  }

  // ── Directory save ──────────────────────────────────────────────────────────
  async function handleSaveDirEntry(type: DirType, data: (Client | Contractor | Worker) & { id?: string }) {
    const table = `${type}s` as 'clients' | 'contractors' | 'workers'
    await saveDirEntry(table, data)
    setModal({ kind: 'none' })
    toast(data.id ? 'Saved' : 'Added')
  }

  async function handleDeleteDirEntry(type: DirType, id: string) {
    const table = `${type}s` as 'clients' | 'contractors' | 'workers'
    await deleteDirEntry(table, id)
    setModal({ kind: 'none' })
    setProfile(null)
    const bv: Record<DirType, ViewName> = { client: 'clients', contractor: 'contractors', worker: 'workers' }
    goView(bv[type])
    toast('Deleted')
  }

  // ── Contact save ────────────────────────────────────────────────────────────
  async function handleSaveContact(parentId: string, ct: Contact) {
    const parent =
      db.clients.find(x => x.id === parentId) ||
      db.contractors.find(x => x.id === parentId)
    if (!parent || !('contacts' in parent)) return
    const table = db.clients.find(x => x.id === parentId) ? 'clients' : 'contractors'
    const contacts = (parent.contacts || [])
    const idx = contacts.findIndex(c => c.id === ct.id)
    const updated = idx >= 0 ? contacts.map((c, i) => i === idx ? ct : c) : [...contacts, ct]
    await supabase.from(table).update({ contacts: updated }).eq('id', parentId)
    await fetchAll()
    setModal({ kind: 'none' })
    toast('Contact saved')
  }

  async function handleDeleteContact(parentId: string, ctId: string) {
    const parent =
      db.clients.find(x => x.id === parentId) ||
      db.contractors.find(x => x.id === parentId)
    if (!parent || !('contacts' in parent)) return
    const table = db.clients.find(x => x.id === parentId) ? 'clients' : 'contractors'
    const updated = (parent.contacts || []).filter(c => c.id !== ctId)
    await supabase.from(table).update({ contacts: updated }).eq('id', parentId)
    await fetchAll()
    toast('Contact deleted')
  }

  // ── Sign out ────────────────────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const navItems: { id: ViewName; label: string; icon: string }[] = [
    { id: 'board', label: 'All projects', icon: '⊞' },
    { id: 'gantt', label: 'Gantt timeline', icon: '▬' },
    { id: 'subview', label: 'Subcontractors', icon: '◫' },
  ]
  const dirItems: { id: ViewName; label: string; icon: string }[] = [
    { id: 'clients', label: 'Clients', icon: '🖥' },
    { id: 'contractors', label: 'Subcontractors', icon: '👤' },
    { id: 'workers', label: 'Workers', icon: '👥' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--tx3)' }}>
        Loading ArchFlow…
      </div>
    )
  }

  const activeView = profile ? null : view

  return (
    <div className="shell">
      {/* Topbar */}
      <div className="topbar">
        <div className="logo">Arch<span>Flow</span></div>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Project OS</span>
        <div className="tp-r">
          {/* Export dropdown */}
          <div className={`ew${exportOpen ? ' open' : ''}`}>
            <button className="btn bsm" onClick={() => setExportOpen(o => !o)}>
              ↓ Export ▾
            </button>
            <div className="edd">
              <button className="eopt" onClick={() => { doCSV(db); setExportOpen(false); toast('CSV exported') }}>📄 CSV</button>
              <button className="eopt" onClick={() => { doExcel(db); setExportOpen(false); toast('Excel exported — 5 sheets') }}>📊 Excel (.xlsx)</button>
              <button className="eopt" onClick={() => { doPrint(db); setExportOpen(false) }}>🖨 Print / PDF</button>
            </div>
          </div>
          <button className="btn bp bsm" onClick={() => setModal({ kind: 'project' })}>+ New project</button>
          <button className="btn bsm" onClick={signOut} style={{ fontSize: 12, color: 'var(--tx3)' }}>Sign out</button>
        </div>
      </div>

      <div className="main">
        {/* Sidebar */}
        <div className="sidebar" onClick={() => setExportOpen(false)}>
          <div className="s-hd">PROJECTS</div>
          {navItems.map(n => (
            <div key={n.id} className={`nav${activeView === n.id ? ' act' : ''}`} onClick={() => goView(n.id)}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
          <div className="s-hd">DIRECTORY</div>
          {dirItems.map(n => (
            <div key={n.id} className={`nav${activeView === n.id ? ' act' : ''}`} onClick={() => goView(n.id)}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}

          {db.clients.length > 0 && (
            <>
              <div className="s-hd">FILTER CLIENT</div>
              <div className={`nav${filterClient === '' ? ' act' : ''}`} onClick={() => { setFilterClient(''); goView('board') }}>
                <span className="dot" style={{ background: 'var(--bd2)' }} />All clients
              </div>
              {db.clients.map(c => (
                <div key={c.id} className={`nav${filterClient === c.id ? ' act' : ''}`} onClick={() => { setFilterClient(c.id); goView('board') }}>
                  <span className="dot" style={{ background: clientColor(db.clients, c.id) }} />
                  {c.name}
                  <span style={{ marginLeft: 'auto', fontSize: 10, opacity: .5, padding: '1px 5px', borderRadius: 8, background: 'rgba(0,0,0,.07)' }}>
                    {db.projects.filter(p => p.client_id === c.id).length}
                  </span>
                </div>
              ))}
            </>
          )}

          <div className="s-hd">FILTER STATUS</div>
          <div className={`nav${filterStatus === '' ? ' act' : ''}`} onClick={() => setFilterStatus('')}>
            <span className="dot" style={{ background: 'var(--bd2)' }} />All
          </div>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <div key={k} className={`nav${filterStatus === k ? ' act' : ''}`} onClick={() => setFilterStatus(k)}>
              <span className="dot" style={{ background: v.col }} />{v.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="content" onClick={() => setExportOpen(false)}>
          {profile ? (
            <ProfileView
              db={db} type={profile.type} id={profile.id}
              onBack={() => { const bv: Record<DirType, ViewName> = { client: 'clients', contractor: 'contractors', worker: 'workers' }; setProfile(null); setView(bv[profile.type]) }}
              onEdit={() => {
                const item = (db[`${profile.type}s` as 'clients' | 'contractors' | 'workers'] as (Client | Contractor | Worker)[]).find(x => x.id === profile.id)
                if (item) setModal({ kind: 'dir', type: profile.type, item })
              }}
              onDelete={() => handleDeleteDirEntry(profile.type, profile.id)}
              onEditProject={id => { const p = db.projects.find(x => x.id === id); if (p) setModal({ kind: 'project', project: p }) }}
              onFilterClient={id => { setFilterClient(id); goView('board') }}
              onAddContact={() => setModal({ kind: 'contact', parentId: profile.id })}
              onEditContact={ct => setModal({ kind: 'contact', parentId: profile.id, contact: ct })}
              onDeleteContact={ctId => handleDeleteContact(profile.id, ctId)}
            />
          ) : view === 'board' ? (
            <BoardView
              db={db} filterClient={filterClient} filterStatus={filterStatus} zoom={zoom}
              setZoom={setZoom} setFilterClient={setFilterClient} setFilterStatus={setFilterStatus}
              onEditProject={p => setModal({ kind: 'project', project: p })}
              onNewProject={() => setModal({ kind: 'project' })}
              onNewTask={pid => setModal({ kind: 'task', projectId: pid })}
              onEditTask={id => { const t = db.tasks.find(x => x.id === id); if (t) setModal({ kind: 'task', task: t }) }}
            />
          ) : view === 'gantt' ? (
            <GanttView
              db={db} filterClient={filterClient} filterStatus={filterStatus} zoom={zoom}
              setZoom={setZoom} setFilterClient={setFilterClient}
              onEditProject={id => { const p = db.projects.find(x => x.id === id); if (p) setModal({ kind: 'project', project: p }) }}
              onEditTask={id => { const t = db.tasks.find(x => x.id === id); if (t) setModal({ kind: 'task', task: t }) }}
              onNewProject={() => setModal({ kind: 'project' })}
            />
          ) : view === 'subview' ? (
            <SubView
              db={db}
              onOpenProfile={(type, id) => setProfile({ type, id })}
              onEditTask={id => { const t = db.tasks.find(x => x.id === id); if (t) setModal({ kind: 'task', task: t }) }}
            />
          ) : view === 'clients' ? (
            <DirectoryView db={db} type="client" onOpenProfile={(t, id) => setProfile({ type: t, id })} onAddEntry={() => setModal({ kind: 'dir', type: 'client' })} />
          ) : view === 'contractors' ? (
            <DirectoryView db={db} type="contractor" onOpenProfile={(t, id) => setProfile({ type: t, id })} onAddEntry={() => setModal({ kind: 'dir', type: 'contractor' })} />
          ) : view === 'workers' ? (
            <DirectoryView db={db} type="worker" onOpenProfile={(t, id) => setProfile({ type: t, id })} onAddEntry={() => setModal({ kind: 'dir', type: 'worker' })} />
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {modal.kind === 'project' && (
        <ProjectModal
          open={true} project={modal.project}
          clients={db.clients} contractors={db.contractors} workers={db.workers}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          onClose={() => setModal({ kind: 'none' })}
          toast={toast}
        />
      )}
      {modal.kind === 'task' && (
        <TaskModal
          open={true} task={modal.task} defaultProjectId={modal.projectId}
          projects={db.projects} contractors={db.contractors} workers={db.workers}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => setModal({ kind: 'none' })}
          toast={toast}
        />
      )}
      {modal.kind === 'dir' && (
        <DirModal
          open={true} type={modal.type} item={modal.item}
          onSave={data => handleSaveDirEntry(modal.type, data)}
          onDelete={id => handleDeleteDirEntry(modal.type, id)}
          onClose={() => setModal({ kind: 'none' })}
          toast={toast}
        />
      )}
      {modal.kind === 'contact' && (
        <ContactModal
          open={true} contact={modal.contact} projects={db.projects}
          onSave={ct => handleSaveContact(modal.parentId, ct)}
          onDelete={ctId => handleDeleteContact(modal.parentId, ctId)}
          onClose={() => setModal({ kind: 'none' })}
          toast={toast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
