'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppDB, Project, Task, Client, Contractor, Worker } from '@/lib/types'
import { dFrom, todayStr } from '@/lib/utils'

const EMPTY_DB: AppDB = { projects: [], tasks: [], clients: [], contractors: [], workers: [] }

export function useAppData() {
  const [db, setDB] = useState<AppDB>(EMPTY_DB)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [p, t, c, sc, w] = await Promise.all([
      supabase.from('projects').select('*').order('created_at'),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('clients').select('*').order('created_at'),
      supabase.from('contractors').select('*').order('created_at'),
      supabase.from('workers').select('*').order('created_at'),
    ])
    setDB({
      projects: (p.data || []) as Project[],
      tasks: (t.data || []) as Task[],
      clients: (c.data || []) as Client[],
      contractors: (sc.data || []) as Contractor[],
      workers: (w.data || []) as Worker[],
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Projects ──────────────────────────────────────────────────────────────
  async function saveProject(data: Omit<Project, 'id'> & { id?: string }) {
    if (data.id) {
      const { id, ...rest } = data
      const { error } = await supabase.from('projects').update(rest).eq('id', id)
      if (error) console.error('saveProject update error:', error)
    } else {
      const { id: _id, ...rest } = data as Project
      void _id
      const { error } = await supabase.from('projects').insert(rest)
      if (error) console.error('saveProject insert error:', error)
    }
    await fetchAll()
  }

  async function deleteProject(id: string) {
    await supabase.from('tasks').delete().eq('project_id', id)
    await supabase.from('projects').delete().eq('id', id)
    await fetchAll()
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async function saveTask(data: Omit<Task, 'id'> & { id?: string }) {
    if (data.id) {
      const { id, ...rest } = data
      const { error } = await supabase.from('tasks').update(rest).eq('id', id)
      if (error) console.error('saveTask update error:', error)
    } else {
      const { id: _id, ...rest } = data as Task
      void _id
      const { error } = await supabase.from('tasks').insert(rest)
      if (error) console.error('saveTask insert error:', error)
    }
    await fetchAll()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    await fetchAll()
  }

  // ── Directory entries ─────────────────────────────────────────────────────
  async function saveDirEntry(
    type: 'clients' | 'contractors' | 'workers',
    data: (Client | Contractor | Worker) & { id?: string }
  ) {
    if (data.id) {
      const { id, ...rest } = data
      await supabase.from(type).update(rest).eq('id', id)
    } else {
      const { id: _id, ...rest } = data as Client
      void _id
      await supabase.from(type).insert(rest)
    }
    await fetchAll()
  }

  async function deleteDirEntry(type: 'clients' | 'contractors' | 'workers', id: string) {
    await supabase.from(type).delete().eq('id', id)
    await fetchAll()
  }

  return { db, loading, fetchAll, saveProject, deleteProject, saveTask, deleteTask, saveDirEntry, deleteDirEntry }
}

export function emptyProject(clientId?: string): Omit<Project, 'id'> {
  return {
    name: '', client_id: clientId || '', start_date: todayStr(), end_date: dFrom(30),
    status: 'planning', pct: 0, notes: '', sqm: null, uses: '', floors: null,
    worker_ids: [], contractor_ids: [],
  }
}

export function emptyTask(projectId?: string): Omit<Task, 'id'> {
  return {
    name: '', project_id: projectId || '', start_date: todayStr(), end_date: dFrom(14),
    status: 'planning', pct: 0, notes: '', worker_ids: [], contractor_ids: [],
  }
}
