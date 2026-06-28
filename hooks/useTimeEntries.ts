'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TimeEntry } from '@/lib/types'

export function useTimeEntries(enabled: boolean) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchEntries = useCallback(async () => {
    if (!enabled) { setLoading(false); return }
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .order('date', { ascending: false })
    setEntries((data || []) as TimeEntry[])
    setLoading(false)
  }, [supabase, enabled])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function saveEntry(data: Omit<TimeEntry, 'id'> & { id?: string }) {
    const payload = {
      task_id: data.task_id,
      worker_id: data.worker_id,
      worker_type: data.worker_type,
      work_type: data.work_type || 'modeller',
      hours: data.hours,
      date: data.date,
      notes: data.notes,
    }
    if (data.id) {
      const { error } = await supabase.from('time_entries').update(payload).eq('id', data.id)
      if (error) console.error('saveEntry update error:', error)
    } else {
      const { error } = await supabase.from('time_entries').insert(payload)
      if (error) console.error('saveEntry insert error:', error)
    }
    await fetchEntries()
  }

  async function deleteEntry(id: string) {
    await supabase.from('time_entries').delete().eq('id', id)
    await fetchEntries()
  }

  // Aggregate hours by task_id
  const hoursByTask: Record<string, number> = {}
  const modellerHoursByTask: Record<string, number> = {}
  const idAutoHoursByTask: Record<string, number> = {}
  entries.forEach(e => {
    hoursByTask[e.task_id] = (hoursByTask[e.task_id] || 0) + Number(e.hours)
    if (e.work_type === 'id_auto') {
      idAutoHoursByTask[e.task_id] = (idAutoHoursByTask[e.task_id] || 0) + Number(e.hours)
    } else {
      modellerHoursByTask[e.task_id] = (modellerHoursByTask[e.task_id] || 0) + Number(e.hours)
    }
  })

  return { entries, loading, saveEntry, deleteEntry, fetchEntries, hoursByTask, modellerHoursByTask, idAutoHoursByTask }
}
