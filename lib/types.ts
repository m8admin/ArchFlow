export type Status = 'planning' | 'pending' | 'active' | 'review' | 'hold' | 'done' | 'delayed'

export interface Contact {
  id: string
  name: string
  role: string
  email: string
  phone: string
  projects: string[]
}

export interface Project {
  id: string
  name: string
  client_id: string
  notes: string
  sqm: number | null
  uses: string
  floors: number | null
  buildings: number | null
  developer: string
  architect: string
  bim_manager: string
  revit_version: string
  city: string
  address: string
  drawings_platform: string
}

export interface Task {
  id: string
  project_id: string
  kind: 'milestone' | 'task'
  name: string
  start_date: string
  end_date: string
  status: Status
  pct: number
  notes: string
  coordinator_id: string | null
  coordinator_type: 'worker' | 'contractor' | null
  modeller_worker_ids: string[]
  modeller_contractor_ids: string[]
  parent_milestone_id: string | null
  modeller_hours: number | null
  pinpoints: SubTask[]
}

export interface SubTask {
  text: string
  done: boolean
}

export interface Client {
  id: string
  name: string
  role: string
  color: string | null
  email: string[]
  phone: string[]
  notes: string
  contacts: Contact[]
}

export interface Contractor {
  id: string
  name: string
  role: string
  email: string[]
  phone: string[]
  notes: string
  contacts: Contact[]
}

export interface Worker {
  id: string
  name: string
  role: string
  email: string[]
  phone: string[]
  notes: string
}

export interface AppDB {
  projects: Project[]
  tasks: Task[]
  clients: Client[]
  contractors: Contractor[]
  workers: Worker[]
}

export const STATUS_META: Record<Status, { label: string; col: string; bg: string }> = {
  planning: { label: 'Planning', col: '#7C6FF7', bg: '#EDE7F6' },
  pending:  { label: 'Pending',  col: '#9E9E9E', bg: '#F5F5F5' },
  active:   { label: 'Active',   col: '#2B6BE8', bg: '#EEF3FD' },
  review:   { label: 'Review',   col: '#D4900A', bg: '#FEF3DC' },
  hold:     { label: 'Hold',     col: '#E65100', bg: '#FFF3E0' },
  done:     { label: 'Done',     col: '#1A7A4A', bg: '#E8F5EE' },
  delayed:  { label: 'Delayed',  col: '#B83232', bg: '#FDEDED' },
}

export type ViewName = 'board' | 'gantt' | 'subview' | 'clients' | 'contractors' | 'workers'
export type ZoomLevel = 'day' | 'week' | 'month' | '3month' | 'year'
export type DirType = 'client' | 'contractor' | 'worker'

export interface ProfileView {
  type: DirType
  id: string
}
