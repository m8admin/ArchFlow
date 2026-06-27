'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

export function useUserProfile() {
  const [role, setRole] = useState<UserRole>('member')
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()
      if (data) setRole(data.role as UserRole)
      setLoading(false)
    }
    load()
  }, [supabase])

  return { role, isAdmin: role === 'admin', loading }
}
