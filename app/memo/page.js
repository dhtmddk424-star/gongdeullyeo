'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Memo() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('memos').select('content').eq('user_id', user.id).single()
      if (data) setContent(data.content || '')
      setLoading(false)
    }
    load()
  }, [router])

  const save = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('memos').upsert({ user_id: user.id, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  useEffect(() => {
    if (!user || loading) return
    const timer = setTimeout(() => { save() }, 2000)
    return () => clearTimeout(timer)
  }, [content])

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>MEMO</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {saved && <span style={{ fontSize: '12px', color: '#C9A882' }}>저장됨 ✓</span>}
            <button onClick={save} disabled={saving} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '16px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '0.5px solid #E8E0D4',
          padding: '0',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* 모눈 격자 배경 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'linear-gradient(#E8E0D4 1px, transparent 1px), linear-gradient(90deg, #E8E0D4 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            opacity: 0.4,
            pointerEvents: 'none',
          }} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="자유롭게 메모하세요..."
            style={{
              width: '100%',
              minHeight: '500px',
              padding: '20px',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#4A3728',
              background: 'transparent',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'sans-serif',
              position: 'relative',
              zIndex: 1,
            }}
          />
        </div>

        <p style={{ fontSize: '11px', color: '#C4B8A8', marginTop: '8px', textAlign: 'center' }}>2초 후 자동 저장됩니다</p>
      </section>
    </main>
  )
}
