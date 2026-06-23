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
        <img src="/icon-192.png" alt="공로그" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
        <span style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45' }}>공로그</span>
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
                background: `url(${avatarUrl || '/default-avatar.png'}) center/cover`,
                cursor: 'pointer', border: '1.5px solid #E8E0D4',
                overflow: 'hidden',
              }}
            />
          </div>
        ) : (
          <div
            onClick={() => router.push('/login')}
            style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'url(/default-avatar.png) center/cover',
              cursor: 'pointer', border: '1.5px solid #E8E0D4',
              overflow: 'hidden',
            }}
          />
        )}
      </div>
    </nav>
  )
}
