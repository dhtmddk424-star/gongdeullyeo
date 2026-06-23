'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('nickname, avatar_url').eq('id', user.id).single()
      if (data?.nickname) setNickname(data.nickname)
      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
    }
    load()
  }, [router])

  const uploadAvatar = async (e) => {
    const file = e.target.files[0]
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `avatar-${user.id}.${ext}`
    const { error } = await supabase.storage.from('posts').upload(fileName, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('posts').getPublicUrl(fileName)
      const url = data.publicUrl + '?t=' + Date.now()
      setAvatarUrl(url)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    }
    setUploading(false)
  }

  const save = async () => {
    if (!nickname.trim() || !user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({ id: user.id, nickname: nickname.trim() })
    if (error) setMessage('저장 실패: ' + error.message)
    else setMessage('저장되었어요!')
    setSaving(false)
    setTimeout(() => setMessage(''), 2000)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <section style={{ maxWidth: '400px', margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '2rem', textAlign: 'center' }}>프로필 설정</h1>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: `url(${avatarUrl || '/default-avatar.png'}) center/cover`,
              cursor: 'pointer', border: '2px solid #E8E0D4',
              overflow: 'hidden', position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '10px', textAlign: 'center', padding: '2px 0' }}>변경</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
          {uploading && <p style={{ fontSize: '12px', color: '#C9A882', marginTop: '8px' }}>업로드 중...</p>}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem' }}>
          <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            maxLength={20}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', boxSizing: 'border-box', marginBottom: '12px' }}
          />

          <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>이메일</label>
          <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '16px' }}>{user?.email}</p>

          {message && <p style={{ fontSize: '13px', color: '#C9A882', marginBottom: '12px' }}>{message}</p>}

          <button onClick={save} disabled={saving} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px', fontSize: '15px', cursor: 'pointer' }}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <span onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem('auto-login'); router.push('/') }} style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }}>로그아웃</span>
          <span style={{ color: '#E8E0D4' }}>·</span>
          <span onClick={() => router.push('/contact')} style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }}>문의하기</span>
        </div>
      </section>
    </main>
  )
}
