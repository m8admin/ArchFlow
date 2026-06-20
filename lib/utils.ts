export const CLIENT_COLORS = ['#2B6BE8','#1A7A4A','#8A5800','#5E35B1','#B83232','#0E7A8A','#7A1A6E']
export const WORKER_COLORS = ['#0E7A8A','#5E35B1','#B83232','#1A7A4A','#8A5800','#2B6BE8','#7A1A6E']

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function todayStr(): string {
  return fmt(today())
}

export function dFrom(n: number): string {
  const d = new Date(today())
  d.setDate(d.getDate() + n)
  return fmt(d)
}

export function pd(s: string): Date {
  const d = new Date(s + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  return d
}

export function ddiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function wkDays(s: string, e: string): number {
  const d = pd(s)
  const end = pd(e)
  let count = 0
  while (d <= end) {
    const wd = d.getDay()
    if (wd >= 1 && wd <= 5) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export function wkn(d: Date): number {
  const s = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7)
}

export function fmtFull(ds: string): string {
  return pd(ds).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function dlCls(e: string): string {
  const diff = (pd(e).getTime() - today().getTime()) / 86400000
  return diff < 0 ? 'overdue' : diff < 7 ? 'due-soon' : ''
}

export function clientColor(clients: { id: string; color?: string | null }[], cid: string): string {
  const client = clients.find(c => c.id === cid)
  if (client?.color) return client.color
  const i = clients.findIndex(c => c.id === cid)
  return CLIENT_COLORS[i >= 0 ? i % CLIENT_COLORS.length : 0] || '#888'
}

export function workerColor(workers: { id: string }[], wid: string): string {
  const i = workers.findIndex(w => w.id === wid)
  return WORKER_COLORS[i >= 0 ? i % WORKER_COLORS.length : 0] || '#888'
}

import type { Task, Status } from './types'

export function projectAggregates(allTasks: Task[]): { start: string; end: string; status: Status; pct: number } {
  const milestones = allTasks.filter(t => t.kind === 'milestone')
  if (!milestones.length) return { start: '', end: '', status: 'planning', pct: 0 }
  const starts = milestones.map(m => m.start_date).sort()
  const ends = milestones.map(m => m.end_date).sort()
  const pct = Math.round(milestones.reduce((a, m) => a + m.pct, 0) / milestones.length)
  let status: Status = 'planning'
  if (milestones.every(m => m.status === 'done')) status = 'done'
  else if (milestones.some(m => m.status === 'delayed')) status = 'delayed'
  else if (milestones.some(m => m.status === 'active')) status = 'active'
  else if (milestones.some(m => m.status === 'review')) status = 'review'
  return { start: starts[0], end: ends[ends.length - 1], status, pct }
}
