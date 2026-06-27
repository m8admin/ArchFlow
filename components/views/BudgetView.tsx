'use client'

import { useState, useRef } from 'react'
import type { Project, ScopeBuilding, ScopeFloor, BudgetItem, PaymentMilestone } from '@/lib/types'

interface Props {
  project: Project
  buildings: ScopeBuilding[]
  floors: ScopeFloor[]
  costItems: BudgetItem[]
  payments: PaymentMilestone[]
  onUpdateProject: (data: Partial<Project>) => Promise<void>
  onAddBuilding: (name: string) => Promise<void>
  onUpdateBuilding: (id: string, data: Partial<ScopeBuilding>) => Promise<void>
  onDeleteBuilding: (id: string) => Promise<void>
  onAddFloor: (buildingId: string) => Promise<void>
  onUpdateFloor: (id: string, data: Partial<ScopeFloor>) => Promise<void>
  onDeleteFloor: (id: string) => Promise<void>
  onAddCostItem: () => Promise<void>
  onUpdateCostItem: (id: string, data: Partial<BudgetItem>) => Promise<void>
  onDeleteCostItem: (id: string) => Promise<void>
  onAddPayment: () => Promise<void>
  onUpdatePayment: (id: string, data: Partial<PaymentMilestone>) => Promise<void>
  onDeletePayment: (id: string) => Promise<void>
  onImportScope: (data: { buildings: { name: string; floors: { type_name: string; floor_label: string; typical_floors: number; floor_count: number; typical_sqm: number; phase_a_hours: number; phase_b_hours: number; notes: string }[] }[] }) => Promise<void>
}

function InlineInput({ value, onChange, type = 'text', style, placeholder }: { value: string | number; onChange: (v: string) => void; type?: string; style?: React.CSSProperties; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={e => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '2px 4px', fontSize: 12, width: '100%', ...style }}
      onFocus={e => { (e.target as HTMLInputElement).style.borderBottomColor = 'var(--bl)' }}
      onBlurCapture={e => { (e.target as HTMLInputElement).style.borderBottomColor = 'transparent' }}
    />
  )
}

export function BudgetView({ project, buildings, floors, costItems, payments, onUpdateProject, onAddBuilding, onUpdateBuilding, onDeleteBuilding, onAddFloor, onUpdateFloor, onDeleteFloor, onAddCostItem, onUpdateCostItem, onDeleteCostItem, onAddPayment, onUpdatePayment, onDeletePayment, onImportScope }: Props) {
  const [detailedBuildings, setDetailedBuildings] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const XLSX = (window as unknown as { XLSX: typeof import('xlsx') }).XLSX
      if (!XLSX) { alert('Excel library loading, try again.'); setImporting(false); return }
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

      const parsed: { name: string; floors: { type_name: string; floor_label: string; typical_floors: number; floor_count: number; typical_sqm: number; phase_a_hours: number; phase_b_hours: number; notes: string }[] }[] = []
      let current: typeof parsed[0] | null = null

      // Detect format from header row
      const headerRow = rows.find(r => r.some(c => typeof c === 'string' && (c === 'Building' || c === 'בניין')))
      const headerIdx = headerRow ? rows.indexOf(headerRow) : -1

      // Find column indices from header
      let colBuilding = -1, colType = -1, colSheet = -1, colFloorLabel = -1
      let colFloorCount = -1, colSqm = -1, colPhaseA = -1, colPhaseB = -1, colNotes = -1

      if (headerRow) {
        headerRow.forEach((h: unknown, i: number) => {
          const s = String(h || '').toLowerCase().trim()
          if (s === 'building' || s === 'בניין') colBuilding = i
          else if (s.includes('typical #') || s === 'טיפוס') colType = i
          else if (s === 'sheet') colSheet = i
          else if (s.includes('floor') && s.includes('typical') || s === 'קומות טיפוסיות') colFloorLabel = i
          else if (s.includes('# of floor') || s === 'מספר קומות') colFloorCount = i
          else if (s.includes('typical sqm') || s.includes('מ"ר טיפוסי')) colSqm = i
          else if (s.includes('phase a') || s.includes('שלב א')) colPhaseA = i
          else if (s.includes('phase b') || s.includes('שלב ב')) colPhaseB = i
          else if (s === 'notes' || s === 'הערות') colNotes = i
        })
      }

      // Format A: Building in col 0, Type in col 1 (like the GYP index)
      // Format B: Building in col 2, Type in col 3 (like original Sirkin)
      const isFormatA = colBuilding === 0 || (headerIdx === -1 && rows.some(r => typeof r[0] === 'number' && typeof r[1] === 'number'))

      if (isFormatA) {
        // Format A: col0=Building#, col1=Type#, col2=Sheet, col3=FloorLabel, col4=Count, col5=SQM, col6=PhA, col7=PhB
        if (colBuilding < 0) colBuilding = 0
        if (colType < 0) colType = 1
        if (colFloorLabel < 0) colFloorLabel = 3
        if (colFloorCount < 0) colFloorCount = 4
        if (colSqm < 0) colSqm = 5
        if (colPhaseA < 0) colPhaseA = 6
        if (colPhaseB < 0) colPhaseB = 7
        if (colSheet < 0) colSheet = 2

        for (let i = (headerIdx >= 0 ? headerIdx + 1 : 0); i < rows.length; i++) {
          const row = rows[i]
          if (!row || !row.length) continue

          // Stop parsing when we hit budget/payment sections or empty building rows
          const rowText = row.map((c: unknown) => String(c || '')).join(' ')
          if (rowText.includes('תקציב') || rowText.includes('אבני דרך') || rowText.includes('אבן דרך') || rowText.includes('Budget') || rowText.includes('Payment') || rowText.includes('עלות') || rowText.includes('רווח')) break

          const bldVal = row[colBuilding]
          const typeVal = row[colType]
          const floorLabel = String(row[colFloorLabel] || '').trim()

          if (typeof bldVal === 'string' && (bldVal === 'Building' || bldVal === 'בניין')) continue

          // Totals row: typeVal is a large number and floorLabel is empty — skip
          if (typeVal != null && !floorLabel) continue

          // New building: has building number AND a type number AND a floor label
          if (bldVal != null && bldVal !== '' && typeof typeVal === 'number' && floorLabel) {
            current = { name: `Building ${bldVal}`, floors: [] }
            parsed.push(current)
          }

          if (typeVal == null && floorLabel === '') { continue }

          if (current && typeof typeVal === 'number' && floorLabel) {
            current.floors.push({
              type_name: String(typeVal),
              floor_label: floorLabel,
              typical_floors: 1,
              floor_count: Number(row[colFloorCount]) || 1,
              typical_sqm: Math.round((Number(row[colSqm]) || 0) * 100) / 100,
              phase_a_hours: Math.round((Number(row[colPhaseA]) || 0) * 100) / 100,
              phase_b_hours: Math.round((Number(row[colPhaseB]) || 0) * 100) / 100,
              notes: String(row[colSheet] || row[colNotes] || '').trim(),
            })
          }
        }
      } else {
        // Format B: col2=Building name, col3=Type#, col4=FloorLabel, col5=Count, col6=SQM, col8=PhA, col9=PhB
        for (const row of rows) {
          const col2 = String(row[2] || '').trim()
          const col3 = row[3]
          const col4 = String(row[4] || '').trim()
          if (col2 === 'בניין' || col2 === 'Building') continue
          if (col2.includes('סה"כ') || col2.includes('Total')) { current = null; continue }

          if (col2 && typeof col3 === 'number' && col4) {
            current = { name: col2.replace(/\n/g, ' '), floors: [] }
            parsed.push(current)
          }

          if (current && typeof col3 === 'number' && col4) {
            current.floors.push({
              type_name: String(col3),
              floor_label: col4,
              typical_floors: Number(row[5]) || 1,
              floor_count: Number(row[5]) || 1,
              typical_sqm: Number(row[6]) || 0,
              phase_a_hours: Number(row[8]) || 0,
              phase_b_hours: Number(row[9]) || 0,
              notes: String(row[12] || '').trim(),
            })
          }
        }
      }

      if (parsed.length === 0) {
        alert('No buildings found in the spreadsheet. Make sure it follows the expected format.')
      } else {
        await onImportScope({ buildings: parsed })
        alert(`Imported ${parsed.length} building(s) with ${parsed.reduce((a, b) => a + b.floors.length, 0)} floor types.`)
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Error reading the Excel file.')
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const clientFee = Number(project.client_fee) || 0
  const vatRate = Number(project.vat_rate) || 18
  const clientFeeInclVat = clientFee * (1 + vatRate / 100)
  const totalCost = costItems.reduce((a, ci) => a + (Number(ci.rate) * Number(ci.planned_hours) * Number(ci.multiplier)), 0)
  const profit = clientFee - totalCost
  const margin = clientFee > 0 ? (profit / clientFee) * 100 : 0

  // Scope totals
  const projectTotalFloors = floors.reduce((a, f) => a + Number(f.floor_count), 0)
  const projectTotalSqm = floors.reduce((a, f) => a + Number(f.typical_sqm) * Number(f.floor_count), 0)
  const projectTotalPhaseA = floors.reduce((a, f) => a + Number(f.phase_a_hours), 0)
  const projectTotalPhaseB = floors.reduce((a, f) => a + Number(f.phase_b_hours), 0)

  return (
    <div>
      {/* ── Financials Summary ── */}
      <div className="sstrip">
        <div className="sc">
          <div className="sc-l">CLIENT FEE (excl. VAT)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--tx3)' }}>₪</span>
            <input type="number" value={clientFee || ''} onChange={e => onUpdateProject({ client_fee: parseFloat(e.target.value) || 0 } as Partial<Project>)} style={{ fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent', width: 120, padding: 0 }} />
          </div>
        </div>
        <div className="sc">
          <div className="sc-l">VAT RATE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="number" value={vatRate} onChange={e => onUpdateProject({ vat_rate: parseFloat(e.target.value) || 18 } as Partial<Project>)} style={{ fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent', width: 50, padding: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--tx3)' }}>%</span>
          </div>
        </div>
        <div className="sc"><div className="sc-l">INCL. VAT</div><div className="sc-v">₪{clientFeeInclVat.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
        <div className="sc"><div className="sc-l">TOTAL COST</div><div className="sc-v">₪{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
        <div className="sc"><div className="sc-l">PROFIT</div><div className="sc-v" style={{ color: profit >= 0 ? 'var(--gn)' : 'var(--rd)' }}>₪{profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
        <div className="sc"><div className="sc-l">MARGIN</div><div className="sc-v" style={{ color: margin >= 0 ? 'var(--gn)' : 'var(--rd)' }}>{margin.toFixed(0)}%</div></div>
      </div>

      {/* ── Scope Breakdown ── */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        Scope Breakdown
        <button className="btn bxs" onClick={() => { const name = prompt('Building name:'); if (name) onAddBuilding(name) }}>+ Add Building</button>
        <button className="btn bxs" onClick={() => fileRef.current?.click()} disabled={importing}>{importing ? 'Importing…' : '📥 Import Excel'}</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} />
        {buildings.length > 0 && <button className="btn bd bxs" onClick={async () => { if (confirm('Delete all buildings and floor data for this project?')) { for (const b of buildings) await onDeleteBuilding(b.id) } }}>Clear all scope</button>}
      </div>

      {buildings.map(bld => {
        const bldFloors = floors.filter(f => f.building_id === bld.id)
        const isDetailed = detailedBuildings[bld.id] !== false
        const totalFloors = bldFloors.reduce((a, f) => a + Number(f.floor_count), 0)
        const totalSqm = bldFloors.reduce((a, f) => a + Number(f.typical_sqm) * Number(f.floor_count), 0)
        const totalPhA = bldFloors.reduce((a, f) => a + Number(f.phase_a_hours), 0)
        const totalPhB = bldFloors.reduce((a, f) => a + Number(f.phase_b_hours), 0)

        return (
          <div key={bld.id} className="tw" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--sf2)', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InlineInput value={bld.name} onChange={v => onUpdateBuilding(bld.id, { name: v })} style={{ fontWeight: 700, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className={`btn bxs${isDetailed ? '' : ' bp'}`} onClick={() => setDetailedBuildings(p => ({ ...p, [bld.id]: !isDetailed }))}>
                  {isDetailed ? 'Totals' : 'Detailed'}
                </button>
                <button className="btn bxs" onClick={() => onAddFloor(bld.id)}>+ Floor</button>
                <button className="btn bd bxs" onClick={() => { if (confirm('Delete building?')) onDeleteBuilding(bld.id) }}>×</button>
              </div>
            </div>

            {isDetailed ? (
              <table>
                <thead>
                  <tr>
                    <th>Typical #</th><th>Floor Label</th><th>Typ. Floors</th><th># of Floors</th>
                    <th>SQM</th><th>Total SQM</th><th>Phase A hrs</th><th>Phase B hrs</th>
                    <th>Notes</th><th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bldFloors.map(fl => (
                    <tr key={fl.id}>
                      <td><InlineInput value={fl.type_name} onChange={v => onUpdateFloor(fl.id, { type_name: v })} placeholder="Type" /></td>
                      <td><InlineInput value={fl.floor_label} onChange={v => onUpdateFloor(fl.id, { floor_label: v })} placeholder="e.g. 1-7" /></td>
                      <td><InlineInput value={fl.typical_floors} onChange={v => onUpdateFloor(fl.id, { typical_floors: parseInt(v) || 0 })} type="number" /></td>
                      <td><InlineInput value={fl.floor_count} onChange={v => onUpdateFloor(fl.id, { floor_count: parseInt(v) || 0 })} type="number" /></td>
                      <td><InlineInput value={fl.typical_sqm} onChange={v => onUpdateFloor(fl.id, { typical_sqm: parseFloat(v) || 0 })} type="number" /></td>
                      <td style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>{(Number(fl.typical_sqm) * Number(fl.floor_count)).toLocaleString()}</td>
                      <td><InlineInput value={fl.phase_a_hours} onChange={v => onUpdateFloor(fl.id, { phase_a_hours: parseFloat(v) || 0 })} type="number" /></td>
                      <td><InlineInput value={fl.phase_b_hours} onChange={v => onUpdateFloor(fl.id, { phase_b_hours: parseFloat(v) || 0 })} type="number" /></td>
                      <td><InlineInput value={fl.notes} onChange={v => onUpdateFloor(fl.id, { notes: v })} placeholder="Notes" /></td>
                      <td><button className="btn bd bxs" onClick={() => onDeleteFloor(fl.id)}>×</button></td>
                    </tr>
                  ))}
                  {!bldFloors.length && (
                    <tr className="er"><td colSpan={10}>No floors — <button className="btn bxs" onClick={() => onAddFloor(bld.id)}>+ Add floor</button></td></tr>
                  )}
                </tbody>
              </table>
            ) : null}

            {/* Totals row */}
            <div style={{ display: 'flex', gap: 16, padding: '8px 12px', background: 'var(--sf2)', borderTop: '1px solid var(--bd)', fontSize: 12, fontWeight: 700, color: 'var(--tx2)' }}>
              <span>Floors: {totalFloors}</span>
              <span>SQM: {totalSqm.toLocaleString()}</span>
              <span>Phase A: {parseFloat(totalPhA.toFixed(2))}h</span>
              <span>Phase B: {parseFloat(totalPhB.toFixed(2))}h</span>
            </div>
          </div>
        )
      })}

      {/* Project scope totals */}
      {buildings.length > 0 && (
        <div style={{ display: 'flex', gap: 16, padding: '10px 14px', marginBottom: 18, fontSize: 13, fontWeight: 700, color: 'var(--tx)', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--rl)' }}>
          <span>Project Total —</span>
          <span>Buildings: {buildings.length}</span>
          <span>Floors: {projectTotalFloors}</span>
          <span>SQM: {projectTotalSqm.toLocaleString()}</span>
          <span>Phase A: {parseFloat(projectTotalPhaseA.toFixed(2))}h</span>
          <span>Phase B: {parseFloat(projectTotalPhaseB.toFixed(2))}h</span>
        </div>
      )}

      {/* ── Cost Items ── */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        Cost Items
        <button className="btn bxs" onClick={onAddCostItem}>+ Add</button>
      </div>
      <div className="tw" style={{ marginBottom: 18 }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>Description</th>
              <th>Category</th><th>Rate</th><th>Hours</th><th>×Mult</th>
              <th>Planned Cost</th><th>Actual Cost</th><th>Variance</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {!costItems.length ? (
              <tr className="er"><td colSpan={9}>No cost items — <button className="btn bxs" onClick={onAddCostItem}>+ Add</button></td></tr>
            ) : costItems.map(ci => {
              const planned = Number(ci.rate) * Number(ci.planned_hours) * Number(ci.multiplier)
              const actual = ci.actual_cost != null ? Number(ci.actual_cost) : null
              const variance = actual != null ? actual - planned : null
              return (
                <tr key={ci.id}>
                  <td><InlineInput value={ci.description} onChange={v => onUpdateCostItem(ci.id, { description: v })} placeholder="Description" /></td>
                  <td>
                    <select value={ci.category} onChange={e => onUpdateCostItem(ci.id, { category: e.target.value as BudgetItem['category'] })} style={{ fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                      <option value="labor">Labor</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                  <td><InlineInput value={ci.rate} onChange={v => onUpdateCostItem(ci.id, { rate: parseFloat(v) || 0 })} type="number" /></td>
                  <td><InlineInput value={ci.planned_hours} onChange={v => onUpdateCostItem(ci.id, { planned_hours: parseFloat(v) || 0 })} type="number" /></td>
                  <td><InlineInput value={ci.multiplier} onChange={v => onUpdateCostItem(ci.id, { multiplier: parseFloat(v) || 1 })} type="number" /></td>
                  <td style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>₪{planned.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td><InlineInput value={actual ?? ''} onChange={v => onUpdateCostItem(ci.id, { actual_cost: v ? parseFloat(v) : null })} type="number" placeholder="—" /></td>
                  <td style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', color: variance != null ? (variance > 0 ? 'var(--rd)' : 'var(--gn)') : 'var(--tx3)' }}>
                    {variance != null ? `${variance > 0 ? '+' : ''}₪${variance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td><button className="btn bd bxs" onClick={() => onDeleteCostItem(ci.id)}>×</button></td>
                </tr>
              )
            })}
            {costItems.length > 0 && (
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--bd)' }}>
                <td colSpan={5} style={{ textAlign: 'right', padding: '6px 8px', fontSize: 12 }}>TOTAL</td>
                <td style={{ fontSize: 12, padding: '6px 8px' }}>₪{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td style={{ fontSize: 12, padding: '6px 8px' }}>₪{costItems.reduce((a, ci) => a + (Number(ci.actual_cost) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Payment Milestones ── */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        Payment Milestones
        <button className="btn bxs" onClick={onAddPayment}>+ Add</button>
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 150 }}>Name</th>
              <th>%</th><th>Amount (excl.)</th><th>Amount (incl.)</th>
              <th>Status</th><th>Date Paid</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {!payments.length ? (
              <tr className="er"><td colSpan={7}>No payment milestones — <button className="btn bxs" onClick={onAddPayment}>+ Add</button></td></tr>
            ) : payments.map(pm => {
              const pct = Number(pm.percentage)
              const amountExcl = clientFee * pct / 100
              const amountIncl = amountExcl * (1 + vatRate / 100)
              return (
                <tr key={pm.id}>
                  <td><InlineInput value={pm.name} onChange={v => onUpdatePayment(pm.id, { name: v })} placeholder="Milestone name" /></td>
                  <td><InlineInput value={pm.percentage} onChange={v => onUpdatePayment(pm.id, { percentage: parseFloat(v) || 0 })} type="number" /></td>
                  <td style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>₪{amountExcl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ fontSize: 12, padding: '4px 8px' }}>₪{amountIncl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td>
                    <select value={pm.status} onChange={e => onUpdatePayment(pm.id, { status: e.target.value as PaymentMilestone['status'] })} style={{ fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: pm.status === 'paid' ? 'var(--gn)' : pm.status === 'invoiced' ? 'var(--am)' : 'var(--tx3)' }}>
                      <option value="pending">Pending</option>
                      <option value="invoiced">Invoiced</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                  <td>
                    {pm.status === 'paid' ? (
                      <input type="date" value={pm.date_paid || ''} onChange={e => onUpdatePayment(pm.id, { date_paid: e.target.value || null })} style={{ fontSize: 11, border: 'none', background: 'transparent' }} />
                    ) : <span style={{ fontSize: 12, color: 'var(--tx3)' }}>—</span>}
                  </td>
                  <td><button className="btn bd bxs" onClick={() => onDeletePayment(pm.id)}>×</button></td>
                </tr>
              )
            })}
            {payments.length > 0 && (
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--bd)' }}>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: 12 }}>TOTAL</td>
                <td style={{ fontSize: 12, padding: '6px 8px' }}>{payments.reduce((a, p) => a + Number(p.percentage), 0).toFixed(0)}%</td>
                <td style={{ fontSize: 12, padding: '6px 8px' }}>₪{(clientFee * payments.reduce((a, p) => a + Number(p.percentage), 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td colSpan={4}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
