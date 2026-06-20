'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppDB, Project, Task, Client, Contractor, Worker } from '@/lib/types'

const EMPTY_DB: AppDB = { projects: [], tasks: [], clients: [], contractors: [], workers: [] }

export function useAppData() {
  const [db, setDB] = useState<AppDB>(EMPTY_DB)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchAll = useCallback(async () => {
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

  async function saveDirEntry(
    type: 'clients' | 'contractors' | 'workers',
    data: (Client | Contractor | Worker) & { id?: string }
  ) {
    if (data.id) {
      const { id, ...rest } = data
      const { error } = await supabase.from(type).update(rest).eq('id', id)
      if (error) console.error('saveDirEntry update error:', error)
    } else {
      const { id: _id, ...rest } = data as Client
      void _id
      const { error } = await supabase.from(type).insert(rest)
      if (error) console.error('saveDirEntry insert error:', error)
    }
    await fetchAll()
  }

  async function deleteDirEntry(type: 'clients' | 'contractors' | 'workers', id: string) {
    await supabase.from(type).delete().eq('id', id)
    await fetchAll()
  }

  return { db, loading, fetchAll, saveProject, deleteProject, saveTask, deleteTask, saveDirEntry, deleteDirEntry }
}
