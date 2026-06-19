import type { AppDB } from './types'
import { STATUS_META } from './types'
import { wkDays, todayStr, clientColor } from './utils'

declare global {
  interface Window { XLSX: typeof import('xlsx') }
}

function loadXLSX() {
  if (typeof window === 'undefined') return
  if (window.XLSX) return
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  document.head.appendChild(s)
}
loadXLSX()

function clientName(db: AppDB, cid: string) { return db.clients.find(c => c.id === cid)?.name || '?' }
function workerNames(db: AppDB, ids: string[]) { return ids.map(id => db.workers.find(w => w.id === id)?.name || id).join('; ') }
function contractorNames(db: AppDB, ids: string[]) { return ids.map(id => db.contractors.find(c => c.id === id)?.name || id).join('; ') }

export function doCSV(db: AppDB) {
  const rows: string[][] = [['Type','Project','Client','sqm','Uses','Floors','Task','Workers','Subcontractors','Start','Deadline','Status','Progress%','Notes']]
  db.projects.forEach(p => {
    rows.push(['Project', p.name, clientName(db, p.client_id), String(p.sqm || ''), p.uses || '', String(p.floors || ''), '', workerNames(db, p.worker_ids || []), contractorNames(db, p.contractor_ids || []), p.start_date, p.end_date, p.status, String(p.pct), p.notes || ''])
    db.tasks.filter(t => t.project_id === p.id).forEach(t => {
      rows.push(['Task', p.name, clientName(db, p.client_id), '', '', '', t.name, workerNames(db, t.worker_ids || []), contractorNames(db, t.contractor_ids || []), t.start_date, t.end_date, t.status, String(t.pct), t.notes || ''])
    })
  })
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `ArchFlow_${todayStr()}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

export function doExcel(db: AppDB) {
  const X = window.XLSX
  if (!X) { alert('Excel library loading, try again in a moment.'); return }
  const wb = X.utils.book_new()

  const pr = [['Project','Client','sqm','Uses','Floors','Start','Deadline','Status','Progress%','Workers','Subcontractors','Notes']]
  db.projects.forEach(p => pr.push([p.name, clientName(db, p.client_id), String(p.sqm || ''), p.uses || '', String(p.floors || ''), p.start_date, p.end_date, STATUS_META[p.status]?.label || p.status, String(p.pct), workerNames(db, p.worker_ids || []), contractorNames(db, p.contractor_ids || []), p.notes || '']))
  const ws1 = X.utils.aoa_to_sheet(pr)
  ws1['!cols'] = Array(12).fill({ wch: 20 })
  X.utils.book_append_sheet(wb, ws1, 'Projects')

  const tr = [['Project','Client','Task','Workers','Subcontractors','Start','Deadline','Status','Progress%']]
  db.tasks.forEach(t => { const p = db.projects.find(x => x.id === t.project_id) || { name: '?', client_id: '' }; tr.push([p.name, clientName(db, p.client_id), t.name, workerNames(db, t.worker_ids || []), contractorNames(db, t.contractor_ids || []), t.start_date, t.end_date, STATUS_META[t.status]?.label || t.status, String(t.pct)]) })
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(tr), 'Tasks')

  const cr = [['Name','Role','Emails','Phones','Notes','Contacts']]
  db.clients.forEach(c => { cr.push([c.name, c.role || '', (c.email || []).join(', '), (c.phone || []).join(', '), c.notes || '', (c.contacts || []).map(ct => `${ct.name} (${ct.role})`).join(', ')]) })
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(cr), 'Clients')

  const scr = [['Name','Role','Emails','Phones','Notes','Contacts']]
  db.contractors.forEach(s => { scr.push([s.name, s.role || '', (s.email || []).join(', '), (s.phone || []).join(', '), s.notes || '', (s.contacts || []).map(ct => `${ct.name} (${ct.role})`).join(', ')]) })
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(scr), 'Subcontractors')

  const wr = [['Name','Role','Emails','Phones','Notes']]
  db.workers.forEach(w => { wr.push([w.name, w.role || '', (w.email || []).join(', '), (w.phone || []).join(', '), w.notes || '']) })
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(wr), 'Workers')

  X.writeFile(wb, `ArchFlow_${todayStr()}.xlsx`)
}

export function doPrint(db: AppDB) {
  const sm = STATUS_META
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const rows = db.projects.map(p => {
    const col = clientColor(db.clients, p.client_id)
    const s = sm[p.status] || { label: p.status, col: '#888', bg: '#eee' }
    const wn = workerNames(db, p.worker_ids || [])
    const scn = contractorNames(db, p.contractor_ids || [])
    let html = `<tr style="background:#fff"><td style="padding:6px 9px;font-weight:700"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:5px;vertical-align:middle"></span>${p.name}</td><td style="padding:6px 9px;color:${col};font-weight:600">${clientName(db, p.client_id)}</td><td style="padding:6px 9px;font-size:12px">${p.sqm ? p.sqm.toLocaleString() : ''}</td><td style="padding:6px 9px;font-size:12px">${p.uses || ''}</td><td style="padding:6px 9px;font-size:12px">${p.floors || ''}</td><td style="padding:6px 9px;font-size:12px">${wn || '—'}</td><td style="padding:6px 9px;font-size:12px">${scn || '—'}</td><td style="padding:6px 9px;font-size:12px">${p.start_date}</td><td style="padding:6px 9px;font-size:12px">${p.end_date}</td><td style="padding:6px 9px"><span style="background:${s.bg};color:${s.col};padding:2px 7px;border-radius:20px;font-size:11px;font-weight:700">${s.label}</span></td><td style="padding:6px 9px"><div style="background:#eee;height:8px;border-radius:20px;overflow:hidden;min-width:60px"><div style="background:${s.col};height:100%;width:${p.pct}%;border-radius:20px"></div></div></td><td style="padding:6px 9px;font-size:12px">${p.pct}%</td></tr>`
    db.tasks.filter(t => t.project_id === p.id).forEach(t => {
      const ts = sm[t.status] || { label: t.status, col: '#888', bg: '#eee' }
      const tw = workerNames(db, t.worker_ids || [])
      const tsc = contractorNames(db, t.contractor_ids || [])
      html += `<tr style="background:#f8f8f6"><td style="padding:5px 9px 5px 24px;font-size:12px;color:#555">↪ ${t.name}</td><td style="padding:5px 9px;font-size:12px;color:${col}">${clientName(db, p.client_id)}</td><td colspan="3"></td><td style="padding:5px 9px;font-size:12px">${tw || '—'}</td><td style="padding:5px 9px;font-size:12px">${tsc || '—'}</td><td style="padding:5px 9px;font-size:12px">${t.start_date}</td><td style="padding:5px 9px;font-size:12px">${t.end_date}</td><td style="padding:5px 9px"><span style="background:${ts.bg};color:${ts.col};padding:2px 7px;border-radius:20px;font-size:11px;font-weight:700">${ts.label}</span></td><td style="padding:5px 9px"><div style="background:#eee;height:8px;border-radius:20px;overflow:hidden;min-width:60px"><div style="background:${ts.col};height:100%;width:${t.pct}%;border-radius:20px"></div></div></td><td style="padding:5px 9px;font-size:12px">${t.pct}%</td></tr>`
    })
    return html
  }).join('')

  const pp = db.projects
  const totalWD = pp.reduce((a, p) => a + wkDays(p.start_date, p.end_date), 0)
  const sqmPP = pp.filter(p => (p.sqm || 0) > 0)
  const avgSqm = sqmPP.length ? Math.round(sqmPP.reduce((a, p) => a + (p.sqm || 0), 0) / sqmPP.length) : 0
  const stats = [
    { l: 'Projects', v: pp.length, c: '' },
    { l: 'Active', v: pp.filter(x => x.status === 'active').length, c: '#2B6BE8' },
    { l: 'Delayed', v: pp.filter(x => x.status === 'delayed').length, c: '#B83232' },
    { l: 'Total Working Days', v: totalWD.toLocaleString(), c: '' },
    { l: 'Avg Typical SQM', v: avgSqm ? `${avgSqm.toLocaleString()} m²` : '--', c: '' },
  ]
  const srow = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0">' + stats.map(s => `<div style="border:1px solid #ddd;border-radius:8px;padding:9px 15px;min-width:100px;flex:1"><div style="font-size:10px;font-weight:600;color:#999;letter-spacing:.05em">${s.l.toUpperCase()}</div><div style="font-size:18px;font-weight:700;color:${s.c || '#1A1917'}">${s.v}</div></div>`).join('') + '</div>'

  const win = window.open('', '_blank', 'width=1300,height=850')
  if (!win) { alert('Allow popups to use print view.'); return }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>ArchFlow Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1A1917;padding:18px;font-size:13px}@media print{@page{size:A4 landscape;margin:10mm}button{display:none !important}tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}}table{width:100%;border-collapse:collapse}thead th{background:#f2f1ee;font-size:10px;font-weight:600;color:#777;padding:7px 10px;text-align:left;border-bottom:2px solid #ddd;letter-spacing:.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact}.nb{margin-bottom:14px;padding:10px 14px;background:#EEF3FD;border-radius:8px;color:#1A4AB5;font-size:13px;display:flex;align-items:center;gap:10px}</style></head><body>`)
  win.document.write(`<div class="nb"><strong>ArchFlow Report</strong><button onclick="window.print()" style="padding:5px 14px;background:#2B6BE8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500">Print / Save PDF</button><span style="font-size:12px;color:#666">Cmd+P or Ctrl+P then Save as PDF</span></div>`)
  win.document.write(`<div style="border-bottom:2px solid #1A1917;padding-bottom:9px;margin-bottom:10px"><div style="font-size:20px;font-weight:800">Arch<span style="color:#2B6BE8">Flow</span> Report</div><div style="font-size:11px;color:#999;margin-top:2px">${today}</div></div>`)
  win.document.write(srow)
  win.document.write(`<table><thead><tr><th>Project / Task</th><th>Client</th><th>sqm</th><th>Uses</th><th>Floors</th><th>Workers</th><th>Subcontractors</th><th>Start</th><th>Deadline</th><th>Status</th><th style="min-width:80px">Progress</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`)
  win.document.write('</body></html>')
  win.document.close()
}
