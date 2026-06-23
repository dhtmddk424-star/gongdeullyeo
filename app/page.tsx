'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Nav from './components/Nav'
import { getTodayQuote } from '../lib/quotes'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [ddays, setDdays] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
        if (data?.nickname) setNickname(data.nickname)
        const { data: dd } = await supabase.from('ddays').select('*').eq('user_id', user.id).order('target_date').limit(3)
        setDdays(dd || [])
      }
    }
    load()
  }, [])

  const getDday = (targetDate: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(targetDate + 'T00:00:00')
    const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    if (diff === 0) return 'D-DAY'
    if (diff > 0) return `D-${diff}`
    return `D+${Math.abs(diff)}`
  }

  const quote = getTodayQuote()

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ padding: '3.5rem 2rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '34px', fontWeight: '500', color: '#4A3728', marginBottom: '12px', lineHeight: '1.4' }}>
          {user && nickname ? `${nickname}님,` : '매일 조금씩,'}<br />공로그 쌓아가요
        </h1>
        <p style={{ fontSize: '16px', color: '#9A8A78', marginBottom: '28px', lineHeight: '1.7' }}>
          오늘의 목표를 세우고, 함께 인증하고,<br />성장을 눈으로 확인하세요.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '2.5rem' }}>
          <button onClick={() => router.push(user ? '/planner' : '/login')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px 28px', fontSize: '15px', cursor: 'pointer' }}>
            {user ? '플래너로 가기' : '무료로 시작하기'}
          </button>
          <button onClick={() => router.push('/community')} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '24px', padding: '12px 28px', fontSize: '15px', cursor: 'pointer' }}>둘러보기</button>
        </div>
      </section>

      {/* D-day */}
      {ddays.length > 0 && (
        <section style={{ padding: '0 2rem 1.5rem' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', gap: '10px' }}>
            {ddays.map(d => (
              <div key={d.id} style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '600', color: '#C9A882', marginBottom: '4px' }}>{getDday(d.target_date)}</div>
                <div style={{ fontSize: '12px', color: '#9A8A78' }}>{d.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 기능 카드 - 유료 기능 포함 */}
      <section style={{ padding: '0 2rem 2rem' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div onClick={() => router.push(user ? '/planner' : '/login')} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', cursor: 'pointer' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#4A3728', marginBottom: '4px' }}>학습 플래너</div>
            <div style={{ fontSize: '12px', color: '#9A8A78' }}>오늘의 할일 관리</div>
          </div>
          <div onClick={() => router.push(user ? '/dashboard' : '/login')} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', cursor: 'pointer' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#4A3728', marginBottom: '4px' }}>대시보드</div>
            <div style={{ fontSize: '12px', color: '#9A8A78' }}>타이머 · 스트릭 · 통계</div>
          </div>
          <div onClick={() => router.push(user ? '/ai-planner' : '/subscribe')} style={{ background: 'linear-gradient(135deg, #FAF0E4, #FFF8F0)', borderRadius: '12px', border: '1px solid #C9A882', padding: '1.25rem', cursor: 'pointer', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#C9A882', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '6px' }}>PRO</span>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#4A3728', marginBottom: '4px' }}>AI 학습 도우미</div>
            <div style={{ fontSize: '12px', color: '#9A8A78' }}>계획표 자동 생성</div>
          </div>
          <div onClick={() => router.push(user ? '/report' : '/subscribe')} style={{ background: 'linear-gradient(135deg, #FAF0E4, #FFF8F0)', borderRadius: '12px', border: '1px solid #C9A882', padding: '1.25rem', cursor: 'pointer', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#C9A882', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '6px' }}>PRO</span>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#4A3728', marginBottom: '4px' }}>AI 학습 리포트</div>
            <div style={{ fontSize: '12px', color: '#9A8A78' }}>맞춤 분석 · 방향 제안</div>
          </div>
        </div>
      </section>

      {/* 명언 */}
      <section style={{ padding: '0 2rem 3rem' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', color: '#6B5B45', lineHeight: '1.7', margin: '0 0 8px', fontStyle: 'italic' }}>"{quote.text}"</p>
          <p style={{ fontSize: '12px', color: '#C4B8A8', margin: 0 }}>— {quote.author}</p>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={{ padding: '1rem 2rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '12px' }}>
          <span style={{ color: '#C4B8A8', cursor: 'pointer' }} onClick={() => router.push('/contact')}>문의하기</span>
          <span style={{ color: '#E8E0D4' }}>·</span>
          <span style={{ color: '#C4B8A8', cursor: 'pointer' }} onClick={() => router.push('/subscribe')}>프리미엄</span>
        </div>
      </footer>
    </main>
  )
}
