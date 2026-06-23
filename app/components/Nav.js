'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('nickname, avatar_url, role').eq('id', user.id).single()
        if (data?.nickname) setNickname(data.nickname)
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
        if (data?.role === 'admin') setIsAdmin(true)
      }
    }
    load()
  }, [])

  const links = [
    { path: '/planner', label: '플래너' },
    { path: '/dashboard', label: '대시보드' },
    { path: '/community', label: '커뮤니티' },
    { path: '/store', label: '자료' },
  ]

  return (
    <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', padding: '0 1.5rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => router.push('/')}>
        <img src="/icon-192.png" alt="공들여" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
        <span style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45' }}>공들여</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {links.map(l => (
          <span
            key={l.path}
            onClick={() => router.push(l.path)}
            style={{
              fontSize: '13px',
              color: pathname === l.path ? '#C9A882' : '#9A8A78',
              fontWeight: pathname === l.path ? '500' : 'normal',
              cursor: 'pointer',
            }}
          >{l.label}</span>
        ))}
        {user ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isAdmin && <span style={{ fontSize: '12px', color: '#C9A882', cursor: 'pointer', border: '0.5px solid #C9A882', borderRadius: '10px', padding: '3px 8px' }} onClick={() => router.push('/admin')}>관리</span>}
            <span style={{ fontSize: '13px', color: '#6B5B45' }}>{nickname || '프로필'}</span>
            <div
              onClick={() => router.push('/profile')}
              style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: avatarUrl ? `url(${avatarUrl}) center/cover` : '#E8D9C8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: '1.5px solid #E8E0D4',
                fontSize: '13px', color: '#6B5B45', fontWeight: '500',
                overflow: 'hidden',
              }}
            >
              {!avatarUrl && (nickname?.slice(0, 1) || '?')}
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer' }}>로그아웃</button>
          </div>
        ) : (
          <button onClick={() => router.push('/login')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>로그인</button>
        )}
      </div>
    </nav>
  )
}
