'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--rl)',
        padding: 32, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,.1)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <img src="/FLOW logo.png" alt="ArchFlow" style={{ height: 44, marginBottom: 4 }} />
          <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
            {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fr">
            <label>Email</label>
            <input
              type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="fr">
            <label>Password</label>
            <input
              type="password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--rd)', background: 'var(--rd-bg)', padding: '8px 12px', borderRadius: 'var(--r)' }}>
              {error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            className="btn bp"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--tx3)', textAlign: 'center' }}>
          {mode === 'signin' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--bl)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: 'var(--bl)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
