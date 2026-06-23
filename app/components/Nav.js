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
    <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: '52px', padding: '0 1rem' }}>
        {/* 로고 - 고정 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }} onClick={() => router.push('/')}>
          <img src="/icon-192.png" alt="공로그" style={{ width: '26px', height: '26px', borderRadius: '6px' }} />
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#6B5B45' }}>공로그</span>
        </div>

        {/* 메뉴 - 스크롤 가능 */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', gap: '14px', padding: '0 12px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.nav-scroll::-webkit-scrollbar { display: none; }`}</style>
          <div className="nav-scroll" style={{ display: 'flex', gap: '14px', alignItems: 'center', whiteSpace: 'nowrap' }}>
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
            {isAdmin && <span style={{ fontSize: '11px', color: '#C9A882', cursor: 'pointer', border: '0.5px solid #C9A882', borderRadius: '10px', padding: '3px 8px', whiteSpace: 'nowrap' }} onClick={() => router.push('/admin')}>관리</span>}
          </div>
        </div>

        {/* 프로필/로그인 - 고정 */}
        <div style={{ flexShrink: 0 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6B5B45', whiteSpace: 'nowrap' }}>{nickname || '프로필'}</span>
              <div
                onClick={() => router.push('/profile')}
                style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: `url(${avatarUrl || '/default-avatar.png'}) center/cover`,
                  cursor: 'pointer', border: '1.5px solid #E8E0D4',
                  overflow: 'hidden', flexShrink: 0,
                }}
              />
            </div>
          ) : (
            <button onClick={() => router.push('/login')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>로그인</button>
          )}
        </div>
      </div>
    </nav>
  )
}
