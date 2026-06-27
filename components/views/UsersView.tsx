'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserRow {
  id: string
  auth_user_id: string
  role: 'admin' | 'member'
  email?: string
}

export function UsersView() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  async function fetchUsers() {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at')
    if (!data) { setLoading(false); return }
    setUsers((data || []).map((p: { id: string; auth_user_id: string; role: string; email?: string }) => ({
      ...p,
      role: p.role as 'admin' | 'member',
      email: p.email || p.auth_user_id.slice(0, 8) + '...',
    })))
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function toggleRole(id: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    if (currentRole === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length
      if (adminCount <= 1) { alert('Cannot remove the last admin.'); return }
    }
    if (!confirm(`Change this user to ${newRole}?`)) return
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', id)
    await fetchUsers()
  }

  if (loading) return <div className="ems">Loading users…</div>

  return (
    <>
      <div className="pg-t">User Management</div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontSize: 13 }}>{u.email}</td>
                <td>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: u.role === 'admin' ? 'var(--bl-bg)' : 'var(--sf2)',
                    color: u.role === 'admin' ? 'var(--bl-tx)' : 'var(--tx3)',
                  }}>{u.role}</span>
                </td>
                <td>
                  <button className="btn bxs" onClick={() => toggleRole(u.id, u.role)}>
                    {u.role === 'admin' ? 'Make member' : 'Make admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 10 }}>
        Admins can access the Back Office (time tracking, budgets, user management). Members see only the project views.
      </p>
    </>
  )
}
