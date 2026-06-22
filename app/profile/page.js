'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (data?.nickname) setNickname(data.nickname)
    }
    load()
  }, [router])

  const save = async () => {
    if (!nickname.trim() || !user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({ id: user.id, nickname: nickname.trim() })
    if (error) setMessage('저장 실패: ' + error.message)
    else setMessage('저장되었어요!')
    setSaving(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', padding: '0 2rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45', cursor: 'pointer' }} onClick={() => router.push('/')}>공들여 📖</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/planner')}>플래너</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/community')}>커뮤니티</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/store')}>자료</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>로그아웃</button>
        </div>
      </nav>

      <section style={{ maxWidth: '400px', margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '8px' }}>프로필 설정</h1>
        <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '2rem' }}>커뮤니티와 자료실에서 보여질 이름이에요</p>

        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem' }}>
          <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            maxLength={20}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', boxSizing: 'border-box', marginBottom: '16px' }}
          />

          {message && <p style={{ fontSize: '13px', color: '#C9A882', marginBottom: '12px' }}>{message}</p>}

          <button onClick={save} disabled={saving} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px', fontSize: '15px', cursor: 'pointer' }}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </section>
    </main>
  )
}
