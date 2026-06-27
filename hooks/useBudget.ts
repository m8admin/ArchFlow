'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScopeBuilding, ScopeFloor, BudgetItem, PaymentMilestone } from '@/lib/types'

export function useBudget(projectId: string | null, enabled: boolean) {
  const [buildings, setBuildings] = useState<ScopeBuilding[]>([])
  const [floors, setFloors] = useState<ScopeFloor[]>([])
  const [costItems, setCostItems] = useState<BudgetItem[]>([])
  const [payments, setPayments] = useState<PaymentMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchAll = useCallback(async () => {
    if (!enabled || !projectId) { setLoading(false); return }
    const [b, f, c, p] = await Promise.all([
      supabase.from('scope_buildings').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('scope_floors').select('*').order('sort_order'),
      supabase.from('budget_items').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('payment_milestones').select('*').eq('project_id', projectId).order('sort_order'),
    ])
    const blds = (b.data || []) as ScopeBuilding[]
    const bldIds = blds.map(x => x.id)
    setBuildings(blds)
    setFloors(((f.data || []) as ScopeFloor[]).filter(fl => bldIds.includes(fl.building_id)))
    setCostItems((c.data || []) as BudgetItem[])
    setPayments((p.data || []) as PaymentMilestone[])
    setLoading(false)
  }, [supabase, projectId, enabled])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Buildings ──
  async function addBuilding(name: string) {
    const { error } = await supabase.from('scope_buildings').insert({ project_id: projectId, name, sort_order: buildings.length })
    if (error) console.error('addBuilding error:', error)
    await fetchAll()
  }
  async function updateBuilding(id: string, data: Partial<ScopeBuilding>) {
    await supabase.from('scope_buildings').update(data).eq('id', id)
    await fetchAll()
  }
  async function deleteBuilding(id: string) {
    await supabase.from('scope_buildings').delete().eq('id', id)
    await fetchAll()
  }

  // ── Floors ──
  async function addFloor(buildingId: string) {
    const count = floors.filter(f => f.building_id === buildingId).length
    await supabase.from('scope_floors').insert({ building_id: buildingId, type_name: '', floor_label: '', sort_order: count })
    await fetchAll()
  }
  async function updateFloor(id: string, data: Partial<ScopeFloor>) {
    await supabase.from('scope_floors').update(data).eq('id', id)
    await fetchAll()
  }
  async function deleteFloor(id: string) {
    await supabase.from('scope_floors').delete().eq('id', id)
    await fetchAll()
  }

  // ── Cost Items ──
  async function addCostItem() {
    const count = costItems.length
    await supabase.from('budget_items').insert({ project_id: projectId, description: '', sort_order: count })
    await fetchAll()
  }
  async function updateCostItem(id: string, data: Partial<BudgetItem>) {
    await supabase.from('budget_items').update(data).eq('id', id)
    await fetchAll()
  }
  async function deleteCostItem(id: string) {
    await supabase.from('budget_items').delete().eq('id', id)
    await fetchAll()
  }

  // ── Payment Milestones ──
  async function addPayment() {
    const count = payments.length
    await supabase.from('payment_milestones').insert({ project_id: projectId, name: '', sort_order: count })
    await fetchAll()
  }
  async function updatePayment(id: string, data: Partial<PaymentMilestone>) {
    await supabase.from('payment_milestones').update(data).eq('id', id)
    await fetchAll()
  }
  async function deletePayment(id: string) {
    await supabase.from('payment_milestones').delete().eq('id', id)
    await fetchAll()
  }

  async function importScope(data: { buildings: { name: string; floors: { type_name: string; floor_label: string; typical_floors: number; floor_count: number; typical_sqm: number; phase_a_hours: number; phase_b_hours: number; notes: string }[] }[] }) {
    for (let i = 0; i < data.buildings.length; i++) {
      const b = data.buildings[i]
      const { data: inserted, error } = await supabase.from('scope_buildings').insert({ project_id: projectId, name: b.name, sort_order: buildings.length + i }).select().single()
      if (error || !inserted) { console.error('importScope building error:', error); continue }
      if (b.floors.length) {
        const floorRows = b.floors.map((f, j) => ({ building_id: inserted.id, ...f, sort_order: j }))
        const { error: fErr } = await supabase.from('scope_floors').insert(floorRows)
        if (fErr) console.error('importScope floors error:', fErr)
      }
    }
    await fetchAll()
  }

  return {
    buildings, floors, costItems, payments, loading,
    addBuilding, updateBuilding, deleteBuilding,
    addFloor, updateFloor, deleteFloor,
    addCostItem, updateCostItem, deleteCostItem,
    addPayment, updatePayment, deletePayment,
    importScope, refresh: fetchAll,
  }
}
