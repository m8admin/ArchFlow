'use client'

import { useState, useRef } from 'react'
import type { Project, ScopeBuilding, ScopeFloor, BudgetItem, PaymentMilestone, Task } from '@/lib/types'

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
  milestones: Task[]
  hoursByTask: Record<string, number>
  onImportScope: (data: {
    buildings: { name: string; floors: { type_name: string; floor_label: string; typical_floors: number; floor_count: number; typical_sqm: number; phase_a_hours: number; phase_b_hours: number; notes: string }[] }[]
    budgetItems?: { description: string; rate: number; planned_hours: number; multiplier: number; notes: string; category: string }[]
    clientFee?: number
    vatRate?: number
  }) => Promise<void>
}

function InlineInput({ value, onChange, type = 'text', style, placeholder }: { value: string | number; onChange: (v: string) => void; type?: string; style?: React.CSSProperties; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '2px 4px', fontSize: 12, width: '100%', ...style }}
      onFocus={e => { (e.target as HTMLInputElement).style.borderBottomColor = 'var(--bl)' }}
      onBlurCapture={e => { (e.target as HTMLInputElement).style.borderBottomColor = 'transparent' }}
    />
  )
}

function fmt$(n: number) { return '₪' + n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

export function BudgetView({ project, buildings, floors, costItems, payments, milestones, hoursByTask, onUpdateProject, onAddBuilding, onUpdateBuilding, onDeleteBuilding, onAddFloor, onUpdateFloor, onDeleteFloor, onAddCostItem, onUpdateCostItem, onDeleteCostItem, onAddPayment, onUpdatePayment, onDeletePayment, onImportScope }: Props) {
  const [detailedBuildings, setDetailedBuildings] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Import Excel ──
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

      type ParsedBuilding = { name: string; floors: { type_name: string; floor_label: string; typical_floors: number; floor_count: number; typical_sqm: number; phase_a_hours: number; phase_b_hours: number; notes: string }[] }
      const parsed: ParsedBuilding[] = []
      let current: ParsedBuilding | null = null

      const headerRow = rows.find((r: unknown[]) => r.some(c => {
        const s = String(c || '').toLowerCase()
        return s === 'building' || s === 'בניין' || s === 'lot'
      }))
      const headerIdx = headerRow ? rows.indexOf(headerRow) : -1
      const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0

      const hdr: Record<string, number> = {}
      if (headerRow) {
        headerRow.forEach((h: unknown, i: number) => {
          const s = String(h || '').toLowerCase().trim()
          if (s === 'lot' || s === 'מגרש') hdr.lot = i
          if (s === 'building' || s === 'בניין') hdr.building = i
          if (s.includes('typical') && s.includes('#') || s.includes('typical floor')) hdr.type = i
          if (s.includes('floor') && s.includes('in') || s.includes('floor label')) hdr.floorLabel = i
          if (s.includes('typical sqm') || s.includes('מ"ר טיפוסי')) hdr.sqm = i
          if (s.includes('# of floor') || s === 'מספר קומות') hdr.floorCount = i
          if (s.includes('phase a') || s.includes('שלב א')) hdr.phaseA = i
          if (s.includes('phase b') || s.includes('שלב ב')) hdr.phaseB = i
          if (s === 'notes' || s === 'הערות') hdr.notes = i
        })
      }

      const hasLot = hdr.lot !== undefined

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row.length) continue
        const rowText = row.map((c: unknown) => String(c || '')).join(' ')
        if (rowText.includes('Budget') || rowText.includes('תקציב') || rowText.includes('אבני דרך') || rowText.includes('עלות') || rowText.includes('רווח') || rowText.includes('Payment')) break
        if (String(row[0] || '').toLowerCase() === 'totals' || String(row[0] || '').includes('סה"כ')) break

        const cBld = hdr.building ?? (hasLot ? 1 : 0)
        const cType = hdr.type ?? (hasLot ? 2 : 1)
        const cLabel = hdr.floorLabel ?? (hasLot ? 3 : 3)
        const cSqm = hdr.sqm ?? (hasLot ? 4 : 5)
        const cNotes = hdr.notes ?? (hasLot ? 5 : -1)
        const cLot = hdr.lot ?? -1
        const cPhA = hdr.phaseA ?? -1
        const cPhB = hdr.phaseB ?? -1
        const cCount = hdr.floorCount ?? -1

        const bldVal = row[cBld]
        const typeVal = row[cType]
        const floorLabel = String(row[cLabel] || '').trim()

        if (typeof bldVal === 'string' && (bldVal.toLowerCase() === 'building' || bldVal === 'בניין')) continue
        if (typeVal != null && !floorLabel) continue

        if (bldVal != null && bldVal !== '' && typeof typeVal === 'number' && floorLabel) {
          const lot = cLot >= 0 && row[cLot] != null && row[cLot] !== '' ? `Lot ${row[cLot]} - ` : ''
          current = { name: `${lot}Building ${bldVal}`, floors: [] }
          parsed.push(current)
        }

        if (typeVal == null && !floorLabel) continue

        if (current && typeof typeVal === 'number' && floorLabel) {
          current.floors.push({
            type_name: String(typeVal),
            floor_label: floorLabel,
            typical_floors: 1,
            floor_count: cCount >= 0 ? (Number(row[cCount]) || 1) : 1,
            typical_sqm: Math.round((Number(row[cSqm]) || 0) * 100) / 100,
            phase_a_hours: cPhA >= 0 ? Math.round((Number(row[cPhA]) || 0) * 100) / 100 : 0,
            phase_b_hours: cPhB >= 0 ? Math.round((Number(row[cPhB]) || 0) * 100) / 100 : 0,
            notes: String(row[cNotes] || '').trim(),
          })
        }
      }

      // Parse budget section
      const budgetItems: { description: string; rate: number; planned_hours: number; multiplier: number; notes: string; category: string }[] = []
      let clientFeeImport = 0
      let vatRateImport = 0
      let inExpBudget = false

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row.length) continue
        const col0 = String(row[0] || '').trim()
        const col1 = String(row[1] || '').trim()

        // Detect VAT rate
        if (col0 === 'Budget Type' || col1 === 'Expanse') {
          for (let j = 0; j < row.length; j++) {
            if (String(row[j] || '').includes('VAT') && typeof row[j + 1] === 'number') {
              vatRateImport = Number(row[j + 1]) * 100
            }
          }
        }

        // Start of expected budget
        if (col0 === 'Exp. Budget') inExpBudget = true
        if (col0 === 'Act. Budget') inExpBudget = false

        // Budget line items (Exp. Budget rows)
        if (inExpBudget && col1 && typeof row[2] === 'number' && typeof row[3] === 'number') {
          budgetItems.push({
            description: col1,
            rate: Number(row[2]) || 0,
            planned_hours: Math.round((Number(row[3]) || 0) * 100) / 100,
            multiplier: Number(row[6]) || 1,
            notes: String(row[7] || '').trim(),
            category: String(row[5] || '').trim(),
          })
        }

        // Operational factor (no rate/hours, just cost)
        if (inExpBudget && col1 === 'Operational Factor' && typeof row[4] === 'number') {
          budgetItems.push({
            description: 'Operational Factor',
            rate: Number(row[4]) || 0,
            planned_hours: 1,
            multiplier: 1,
            notes: String(row[7] || '-').trim(),
            category: String(row[5] || '').trim(),
          })
        }

        // Client cost
        if (col1 === 'Clients Cost' && typeof row[4] === 'number') {
          clientFeeImport = Number(row[4])
        }
      }

      if (parsed.length === 0 && budgetItems.length === 0) {
        alert('No data found in the spreadsheet.')
      } else {
        await onImportScope({
          buildings: parsed,
          budgetItems: budgetItems.length > 0 ? budgetItems : undefined,
          clientFee: clientFeeImport || undefined,
          vatRate: vatRateImport || undefined,
        })
        const parts = []
        if (parsed.length) parts.push(`${parsed.length} building(s) with ${parsed.reduce((a, b) => a + b.floors.length, 0)} floor types`)
        if (budgetItems.length) parts.push(`${budgetItems.length} budget line(s)`)
        if (clientFeeImport) parts.push(`client fee ₪${clientFeeImport.toLocaleString()}`)
        alert(`Imported: ${parts.join(', ')}`)
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Error reading the Excel file.')
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Computed values ──
  const clientFee = Number(project.client_fee) || 0
  const vatRate = Number(project.vat_rate) || 18
  const clientFeeInclVat = clientFee * (1 + vatRate / 100)

  // Scope totals
  const totalTypicals = floors.length
  const projectTotalSqm = floors.reduce((a, f) => a + Number(f.typical_sqm), 0)
  const avgSqmPerTypical = totalTypicals > 0 ? projectTotalSqm / totalTypicals : 0

  // Budget: expected
  const expItems = costItems.filter(ci => ci.category !== 'other' || ci.description)
  const totalExpCost = costItems.reduce((a, ci) => a + (Number(ci.rate) * Number(ci.planned_hours) * Number(ci.multiplier)), 0)
  // Budget: actual
  const totalActCost = costItems.reduce((a, ci) => a + (Number(ci.actual_cost) || 0), 0)
  const profit = clientFee - totalExpCost
  const margin = clientFee > 0 ? (profit / clientFee) * 100 : 0
  const actualProfit = clientFee - totalActCost
  const actualMargin = clientFee > 0 ? (actualProfit / clientFee) * 100 : 0

  return (
    <div>
      {/* ── 1. Scope Breakdown ── */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        Scope Breakdown
        <button className="btn bxs" onClick={() => { const name = prompt('Building name:'); if (name) onAddBuilding(name) }}>+ Add Building</button>
        <button className="btn bxs" onClick={() => fileRef.current?.click()} disabled={importing}>{importing ? 'Importing…' : '📥 Import Excel'}</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} />
        {buildings.length > 0 && <button className="btn bd bxs" onClick={async () => { if (confirm('Delete all buildings and floor data for this project?')) { for (const b of buildings) await onDeleteBuilding(b.id) } }}>Clear all scope</button>}
      </div>

      <div className="tw" style={{ marginBottom: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Lot</th><th>Building</th><th>Typical Floor #</th><th>Floors in Typical</th><th>Typical SQM</th><th>Notes</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {!buildings.length ? (
              <tr className="er"><td colSpan={7}>No scope data — use + Add Building or Import Excel above.</td></tr>
            ) : buildings.map(bld => {
              const bldFloors = floors.filter(f => f.building_id === bld.id)
              // Parse lot and building from name (format: "Lot X - Building Y" or "Building Y")
              const nameParts = bld.name.match(/^(?:Lot\s+(.+?)\s*-\s*)?(?:Building\s+)?(.+)$/i)
              const lotDisplay = nameParts?.[1] || ''
              const bldDisplay = nameParts?.[2] || bld.name
              const bldSqm = bldFloors.reduce((a, f) => a + Number(f.typical_sqm), 0)

              if (!bldFloors.length) {
                return (
                  <tr key={bld.id}>
                    <td><InlineInput value={lotDisplay} onChange={v => { const b = v ? `Lot ${v} - Building ${bldDisplay}` : `Building ${bldDisplay}`; onUpdateBuilding(bld.id, { name: b }) }} placeholder="Lot" /></td>
                    <td><InlineInput value={bldDisplay} onChange={v => { const b = lotDisplay ? `Lot ${lotDisplay} - Building ${v}` : `Building ${v}`; onUpdateBuilding(bld.id, { name: b }) }} placeholder="Bld" /></td>
                    <td colSpan={4} style={{ fontSize: 12, color: 'var(--tx3)' }}>No floors — <button className="btn bxs" onClick={() => onAddFloor(bld.id)}>+ Add</button></td>
                    <td><button className="btn bd bxs" onClick={() => { if (confirm('Delete building?')) onDeleteBuilding(bld.id) }}>×</button></td>
                  </tr>
                )
              }

              return [
                ...bldFloors.map((fl, fi) => (
                  <tr key={fl.id} style={fi === 0 ? { borderTop: '2px solid var(--bd)' } : undefined}>
                    {fi === 0 && (
                      <>
                        <td rowSpan={bldFloors.length + 1} style={{ verticalAlign: 'top', fontWeight: 600, fontSize: 12 }}>
                          <InlineInput value={lotDisplay} onChange={v => { const b = v ? `Lot ${v} - Building ${bldDisplay}` : `Building ${bldDisplay}`; onUpdateBuilding(bld.id, { name: b }) }} placeholder="Lot" />
                        </td>
                        <td rowSpan={bldFloors.length + 1} style={{ verticalAlign: 'top', fontWeight: 600, fontSize: 12 }}>
                          <InlineInput value={bldDisplay} onChange={v => { const b = lotDisplay ? `Lot ${lotDisplay} - Building ${v}` : `Building ${v}`; onUpdateBuilding(bld.id, { name: b }) }} placeholder="Bld" style={{ fontWeight: 700 }} />
                        </td>
                      </>
                    )}
                    <td><InlineInput value={fl.type_name} onChange={v => onUpdateFloor(fl.id, { type_name: v })} placeholder="#" /></td>
                    <td><InlineInput value={fl.floor_label} onChange={v => onUpdateFloor(fl.id, { floor_label: v })} placeholder="e.g. 1-7" /></td>
                    <td><InlineInput value={fl.typical_sqm} onChange={v => onUpdateFloor(fl.id, { typical_sqm: parseFloat(v) || 0 })} type="number" /></td>
                    <td><InlineInput value={fl.notes} onChange={v => onUpdateFloor(fl.id, { notes: v })} placeholder="Notes" /></td>
                    <td><button className="btn bd bxs" onClick={() => onDeleteFloor(fl.id)}>×</button></td>
                  </tr>
                )),
                <tr key={`${bld.id}-total`} style={{ background: 'var(--sf2)' }}>
                  <td colSpan={2} style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textAlign: 'right', padding: '4px 8px' }}>{bldFloors.length} typicals</td>
                  <td style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx2)', padding: '4px 8px' }}>{parseFloat(bldSqm.toFixed(2))}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn bxs" onClick={() => onAddFloor(bld.id)}>+</button>
                      <button className="btn bd bxs" onClick={() => { if (confirm('Delete building and all its floors?')) onDeleteBuilding(bld.id) }}>× Bld</button>
                    </div>
                  </td>
                  <td></td>
                </tr>,
              ]
            })}
            {buildings.length > 0 && (
              <tr style={{ fontWeight: 700, borderTop: '3px solid var(--bd)', background: 'var(--sf2)' }}>
                <td colSpan={2} style={{ padding: '8px', fontSize: 12 }}>Project Total — {buildings.length} buildings</td>
                <td style={{ fontSize: 12, padding: '8px' }}>{totalTypicals} typicals</td>
                <td></td>
                <td style={{ fontSize: 12, padding: '8px', fontWeight: 700 }}>{parseFloat(projectTotalSqm.toFixed(2))}</td>
                <td style={{ fontSize: 11, color: 'var(--tx3)', padding: '8px' }}>Avg: {parseFloat(avgSqmPerTypical.toFixed(2))} sqm/typ</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 2. Budget ── */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700 }}>Coefficients</div>
      <div className="sstrip" style={{ marginBottom: 14 }}>
        <div className="sc"><div className="sc-l">TOTAL TYPICALS</div><div className="sc-v">{totalTypicals}</div></div>
        <div className="sc"><div className="sc-l">TOTAL SQM</div><div className="sc-v">{parseFloat(projectTotalSqm.toFixed(2))}</div></div>
        <div className="sc"><div className="sc-l">AVG SQM / TYPICAL</div><div className="sc-v">{parseFloat(avgSqmPerTypical.toFixed(2))}</div></div>
      </div>

      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        Expected Budget
        <button className="btn bxs" onClick={onAddCostItem}>+ Add line</button>
        {costItems.length > 0 && <button className="btn bd bxs" onClick={async () => { if (confirm('Delete all budget lines?')) { for (const ci of costItems) await onDeleteCostItem(ci.id) } }}>Clear budget</button>}
      </div>
      <div className="tw" style={{ marginBottom: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>Expense</th>
              <th>Rate (₪/hr)</th><th># Hours</th><th>Risk ×</th>
              <th>Cost</th><th>Milestone</th><th>Assigned To</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {!costItems.length ? (
              <tr className="er"><td colSpan={8}>No budget lines — <button className="btn bxs" onClick={onAddCostItem}>+ Add</button></td></tr>
            ) : costItems.map(ci => {
              const planned = Number(ci.rate) * Number(ci.planned_hours) * Number(ci.multiplier)
              return (
                <tr key={ci.id}>
                  <td><InlineInput value={ci.description} onChange={v => onUpdateCostItem(ci.id, { description: v })} placeholder="e.g. Phase-A Modeller" /></td>
                  <td><InlineInput value={ci.rate} onChange={v => onUpdateCostItem(ci.id, { rate: parseFloat(v) || 0 })} type="number" /></td>
                  <td><InlineInput value={ci.planned_hours} onChange={v => onUpdateCostItem(ci.id, { planned_hours: parseFloat(v) || 0 })} type="number" /></td>
                  <td><InlineInput value={ci.multiplier} onChange={v => onUpdateCostItem(ci.id, { multiplier: parseFloat(v) || 1 })} type="number" /></td>
                  <td style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>{fmt$(planned)}</td>
                  <td><InlineInput value={ci.category} onChange={v => onUpdateCostItem(ci.id, { category: v as BudgetItem['category'] })} placeholder="A / B" style={{ width: 40 }} /></td>
                  <td><InlineInput value={ci.notes} onChange={v => onUpdateCostItem(ci.id, { notes: v })} placeholder="Name" /></td>
                  <td><button className="btn bd bxs" onClick={() => onDeleteCostItem(ci.id)}>×</button></td>
                </tr>
              )
            })}
            {costItems.length > 0 && (
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--bd)' }}>
                <td colSpan={4} style={{ textAlign: 'right', padding: '6px 8px', fontSize: 12 }}>TOTAL OPERATIONAL BUDGET</td>
                <td style={{ fontSize: 12, padding: '6px 8px' }}>{fmt$(totalExpCost)}</td>
                <td colSpan={3}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actual Budget */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700 }}>Actual Budget</div>
      <div className="tw" style={{ marginBottom: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>Expense</th>
              <th>Actual Cost</th><th>Expected</th><th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {!costItems.length ? (
              <tr className="er"><td colSpan={4}>Add expected budget lines first.</td></tr>
            ) : costItems.map(ci => {
              const expected = Number(ci.rate) * Number(ci.planned_hours) * Number(ci.multiplier)
              const actual = Number(ci.actual_cost) || 0
              const variance = actual - expected
              return (
                <tr key={ci.id}>
                  <td style={{ fontSize: 12 }}>{ci.description || '—'}</td>
                  <td><InlineInput value={ci.actual_cost ?? ''} onChange={v => onUpdateCostItem(ci.id, { actual_cost: v ? parseFloat(v) : null })} type="number" placeholder="—" /></td>
                  <td style={{ fontSize: 12, padding: '4px 8px', color: 'var(--tx3)' }}>{fmt$(expected)}</td>
                  <td style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', color: actual ? (variance > 0 ? 'var(--rd)' : 'var(--gn)') : 'var(--tx3)' }}>
                    {actual ? `${variance > 0 ? '+' : ''}${fmt$(variance)}` : '—'}
                  </td>
                </tr>
              )
            })}
            {costItems.length > 0 && (
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--bd)' }}>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: 12 }}>TOTAL</td>
                <td style={{ fontSize: 12, padding: '6px 8px' }}>{fmt$(totalActCost)}</td>
                <td style={{ fontSize: 12, padding: '6px 8px', color: 'var(--tx3)' }}>{fmt$(totalExpCost)}</td>
                <td style={{ fontSize: 12, padding: '6px 8px', color: totalActCost ? (totalActCost > totalExpCost ? 'var(--rd)' : 'var(--gn)') : 'var(--tx3)' }}>
                  {totalActCost ? `${totalActCost > totalExpCost ? '+' : ''}${fmt$(totalActCost - totalExpCost)}` : '—'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Milestone Phase Breakdown ── */}
      {(() => {
        const phases = [...new Set(milestones.filter(m => m.phase).map(m => m.phase.toUpperCase()))].sort()
        const budgetByPhase: Record<string, number> = {}
        costItems.forEach(ci => {
          const p = (ci.category || '').toUpperCase().trim()
          if (p) budgetByPhase[p] = (budgetByPhase[p] || 0) + (Number(ci.rate) * Number(ci.planned_hours) * Number(ci.multiplier))
        })
        const allPhases = [...new Set([...phases, ...Object.keys(budgetByPhase)])].sort()
        if (!allPhases.length) return null
        return (
          <>
            <div className="sec-t" style={{ fontSize: 14, fontWeight: 700 }}>Milestones by Phase</div>
            <div className="tw" style={{ marginBottom: 18 }}>
              <table>
                <thead>
                  <tr><th>Phase</th><th>Milestones</th><th>Budget (exp.)</th><th>Planned Hours</th><th>Actual Hours</th><th>Variance</th><th style={{ minWidth: 100 }}></th></tr>
                </thead>
                <tbody>
                  {allPhases.map(ph => {
                    const phaseMilestones = milestones.filter(m => (m.phase || '').toUpperCase() === ph)
                    const plannedHrs = phaseMilestones.reduce((a, m) => a + (m.modeller_hours || 0), 0)
                    const actualHrs = phaseMilestones.reduce((a, m) => a + (hoursByTask[m.id] || 0), 0)
                    const variance = actualHrs - plannedHrs
                    const budgetAmt = budgetByPhase[ph] || 0
                    const pct = plannedHrs > 0 ? Math.min(100, (actualHrs / plannedHrs) * 100) : 0
                    const over = plannedHrs > 0 && actualHrs > plannedHrs
                    return (
                      <tr key={ph}>
                        <td style={{ fontWeight: 700, fontSize: 14 }}>{ph}</td>
                        <td style={{ fontSize: 12 }}>{phaseMilestones.map(m => m.name).join(', ') || '—'}</td>
                        <td style={{ fontSize: 12 }}>{budgetAmt ? fmt$(budgetAmt) : '—'}</td>
                        <td style={{ fontSize: 12 }}>{plannedHrs ? `${plannedHrs}h` : '—'}</td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{actualHrs ? `${parseFloat(actualHrs.toFixed(1))}h` : '—'}</td>
                        <td style={{ fontSize: 12, fontWeight: 600, color: over ? 'var(--rd)' : variance < 0 ? 'var(--gn)' : 'var(--tx3)' }}>
                          {plannedHrs ? `${variance > 0 ? '+' : ''}${parseFloat(variance.toFixed(1))}h` : '—'}
                        </td>
                        <td>
                          <div style={{ background: 'var(--sf2)', height: 8, borderRadius: 20, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, background: over ? 'var(--rd)' : 'var(--bl)' }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      })()}

      {/* ── 3. Financials Summary ── */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700 }}>Financials</div>
      <div className="sstrip">
        <div className="sc">
          <div className="sc-l">CLIENT FEE (excl. VAT)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--tx3)' }}>₪</span>
            <input type="number" value={clientFee || ''} onChange={e => onUpdateProject({ client_fee: parseFloat(e.target.value) || 0 } as Partial<Project>)} style={{ fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent', width: 120, padding: 0 }} />
          </div>
        </div>
        <div className="sc">
          <div className="sc-l">VAT ({vatRate}%)</div>
          <div className="sc-v">{fmt$(clientFeeInclVat - clientFee)}</div>
        </div>
        <div className="sc"><div className="sc-l">INCL. VAT</div><div className="sc-v">{fmt$(clientFeeInclVat)}</div></div>
        <div className="sc"><div className="sc-l">TOTAL COST (exp.)</div><div className="sc-v">{fmt$(totalExpCost)}</div></div>
        <div className="sc"><div className="sc-l">EXPECTED PROFIT</div><div className="sc-v" style={{ color: profit >= 0 ? 'var(--gn)' : 'var(--rd)' }}>{fmt$(profit)}</div><div className="sc-s">{margin.toFixed(0)}% margin</div></div>
        <div className="sc"><div className="sc-l">ACTUAL PROFIT</div><div className="sc-v" style={{ color: totalActCost ? (actualProfit >= 0 ? 'var(--gn)' : 'var(--rd)') : 'var(--tx3)' }}>{totalActCost ? fmt$(actualProfit) : '—'}</div>{totalActCost > 0 && <div className="sc-s">{actualMargin.toFixed(0)}% margin</div>}</div>
      </div>

      {/* ── 4. Payment Milestones ── */}
      <div className="sec-t" style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
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
                  <td style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>{fmt$(amountExcl)}</td>
                  <td style={{ fontSize: 12, padding: '4px 8px' }}>{fmt$(amountIncl)}</td>
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
                <td style={{ fontSize: 12, padding: '6px 8px' }}>{fmt$(clientFee * payments.reduce((a, p) => a + Number(p.percentage), 0) / 100)}</td>
                <td colSpan={4}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
