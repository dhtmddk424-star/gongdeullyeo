'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { checkPremium } from '../../lib/subscription'
import Nav from '../components/Nav'

export default function Subscribe() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const premium = await checkPremium(user.id)
      setIsPremium(premium)
      setLoading(false)
    }
    load()
  }, [router])

  const handleSubscribe = () => {
    alert('결제 시스템 준비 중입니다! 곧 토스페이먼츠로 연동될 예정이에요.')
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ maxWidth: '500px', margin: '0 auto', padding: '3rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', color: '#4A3728', marginBottom: '8px' }}>공들여 프리미엄</h1>
        <p style={{ fontSize: '15px', color: '#9A8A78', marginBottom: '2.5rem', lineHeight: '1.7' }}>
          AI가 학습을 분석하고, 맞춤 리포트를 제공해요
        </p>

        {isPremium ? (
          <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #E8E0D4', padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
            <h2 style={{ fontSize: '20px', color: '#4A3728', marginBottom: '8px' }}>프리미엄 구독 중</h2>
            <p style={{ fontSize: '14px', color: '#9A8A78' }}>모든 프리미엄 기능을 이용하실 수 있어요!</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button onClick={() => router.push('/ai-planner')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>AI 플래너</button>
              <button onClick={() => router.push('/report')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>AI 리포트</button>
            </div>
          </div>
        ) : (
          <>
            {/* 무료 vs 프리미엄 비교 */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '2rem' }}>
              <div style={{ flex: 1, background: '#fff', borderRadius: '16px', border: '0.5px solid #E8E0D4', padding: '1.5rem', textAlign: 'left' }}>
                <h3 style={{ fontSize: '16px', color: '#9A8A78', marginBottom: '16px' }}>무료</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: '#6B5B45', lineHeight: '2.2' }}>
                  <li>✓ 학습 플래너</li>
                  <li>✓ 커뮤니티 인증</li>
                  <li>✓ 자료 공유</li>
                  <li>✓ D-day / 스트릭</li>
                  <li>✓ 공부 타이머</li>
                  <li>✓ 인스타 카드</li>
                  <li style={{ color: '#D4C8B8' }}>✕ AI 학습 도우미</li>
                  <li style={{ color: '#D4C8B8' }}>✕ AI 학습 리포트</li>
                </ul>
              </div>

              <div style={{ flex: 1, background: 'linear-gradient(135deg, #FAF0E4, #FFF8F0)', borderRadius: '16px', border: '2px solid #C9A882', padding: '1.5rem', textAlign: 'left', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '16px', background: '#C9A882', color: '#fff', fontSize: '11px', padding: '3px 12px', borderRadius: '10px' }}>추천</div>
                <h3 style={{ fontSize: '16px', color: '#4A3728', marginBottom: '16px' }}>프리미엄</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: '#6B5B45', lineHeight: '2.2' }}>
                  <li>✓ 무료 기능 전부 포함</li>
                  <li style={{ color: '#C9A882', fontWeight: '500' }}>✨ AI 학습 플래너 파싱</li>
                  <li style={{ color: '#C9A882', fontWeight: '500' }}>✨ 주간/월간 AI 리포트</li>
                  <li style={{ color: '#C9A882', fontWeight: '500' }}>✨ 맞춤 학습 방향 제안</li>
                  <li style={{ color: '#C9A882', fontWeight: '500' }}>✨ 무제한 자료 다운로드</li>
                </ul>
              </div>
            </div>

            {/* 가격 + 구독 버튼 */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #E8E0D4', padding: '2rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: '600', color: '#4A3728' }}>4,900</span>
                <span style={{ fontSize: '16px', color: '#9A8A78' }}>원/월</span>
              </div>
              <p style={{ fontSize: '13px', color: '#C4B8A8', marginBottom: '20px' }}>언제든 해지 가능 · 첫 7일 무료 체험</p>
              <button onClick={handleSubscribe} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '14px', fontSize: '16px', cursor: 'pointer', fontWeight: '500' }}>
                프리미엄 시작하기
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#C4B8A8' }}>결제 시스템 연동 후 활성화됩니다</p>
          </>
        )}
      </section>
    </main>
  )
}
