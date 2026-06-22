'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const quotes = [
  "작은 노력이 모여 큰 변화를 만든다.",
  "오늘의 한 시간이 내일의 나를 만든다.",
  "꾸준함은 재능을 이긴다.",
  "지금 포기하면 어제의 노력이 아깝다.",
  "느려도 괜찮아, 멈추지만 않으면.",
  "할 수 있다고 믿는 순간 이미 반은 이룬 것.",
  "가장 좋은 시작은 지금이다.",
  "어제보다 나은 오늘, 그것으로 충분하다.",
  "힘들 때 한 걸음 더가 진짜 실력이 된다.",
  "목표를 적으면 현실이 된다.",
  "공부는 미래의 나에게 주는 가장 큰 선물.",
  "포기는 습관이고, 끈기도 습관이다.",
  "오늘의 땀이 내일의 자신감이 된다.",
  "남들이 쉴 때 한 페이지 더.",
  "실패는 성공의 연습이다.",
  "집중한 1시간이 멍한 5시간보다 낫다.",
  "잘하는 사람도 처음엔 못했다.",
  "꿈꾸는 것만으로는 부족해, 실행하자.",
  "매일 1%씩 성장하면 1년 후엔 37배.",
  "지금 이 순간이 가장 젊은 나다.",
  "완벽하지 않아도 돼, 시작만 하면 돼.",
  "어려운 문제일수록 풀었을 때 기쁨이 크다.",
  "지치면 쉬어도 돼, 포기만 하지 마.",
  "내가 나를 믿어야 세상도 나를 믿는다.",
  "합격의 차이는 결국 꾸준함이다.",
  "오늘 하루도 어제의 나보다 한 뼘 더.",
  "공부하는 이유가 분명하면 포기할 수 없다.",
  "남과 비교 말고, 어제의 나와 비교하자.",
  "해야 할 일을 미루지 마, 미래의 내가 고마워할 거야.",
  "시간은 누구에게나 공평하다. 차이는 사용법.",
  "지금 읽는 이 한 줄이 미래를 바꾼다.",
]

function getTodayQuote() {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  return quotes[dayOfYear % quotes.length]
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
        if (data?.nickname) setNickname(data.nickname)
      }
    }
    load()
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', padding: '0 2rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45' }}>공들여 📖</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/planner')}>플래너</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>대시보드</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/community')}>커뮤니티</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/store')}>자료</span>
          {user ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6B5B45', cursor: 'pointer' }} onClick={() => router.push('/profile')}>{nickname || '프로필'}</span>
              <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setNickname(''); router.push('/') }} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>로그아웃</button>
            </div>
          ) : (
            <button onClick={() => router.push('/login')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>시작하기</button>
          )}
        </div>
      </nav>

      <section style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '500', color: '#4A3728', marginBottom: '16px' }}>
          {user && nickname ? `${nickname}님,` : '매일 조금씩,'}<br />공들여 쌓아가요
        </h1>

        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem 2rem', maxWidth: '480px', margin: '0 auto 32px', fontStyle: 'italic' }}>
          <p style={{ fontSize: '15px', color: '#6B5B45', lineHeight: '1.7', margin: 0 }}>"{getTodayQuote()}"</p>
        </div>

        <p style={{ fontSize: '16px', color: '#9A8A78', marginBottom: '32px', lineHeight: '1.7' }}>
          오늘의 목표를 세우고, 함께 인증하고,<br />성장을 눈으로 확인하세요.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => router.push(user ? '/planner' : '/login')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px 28px', fontSize: '15px', cursor: 'pointer' }}>
            {user ? '플래너로 가기' : '무료로 시작하기'}
          </button>
          <button onClick={() => router.push('/community')} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '24px', padding: '12px 28px', fontSize: '15px', cursor: 'pointer' }}>둘러보기</button>
        </div>
      </section>

      <section style={{ padding: '0 2rem 4rem', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, #FAF0E4, #FFF8F0)', borderRadius: '16px', border: '1.5px solid #C9A882', padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#4A3728', marginBottom: '8px' }}>프리미엄으로 더 똑똑하게</h2>
          <p style={{ fontSize: '14px', color: '#9A8A78', lineHeight: '1.7', marginBottom: '16px' }}>
            AI가 학습 계획을 파싱하고<br />주간/월간 맞춤 리포트를 제공해요
          </p>
          <button onClick={() => router.push('/subscribe')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}>프리미엄 알아보기</button>
        </div>
      </section>
    </main>
  )
}
