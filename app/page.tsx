'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Nav from './components/Nav'

const quotes = [
  { text: "작은 노력이 모여 큰 변화를 만든다.", author: "로버트 콜리어" },
  { text: "오늘의 한 시간이 내일의 나를 만든다.", author: "벤자민 프랭클린" },
  { text: "꾸준함은 재능을 이긴다.", author: "앤절라 더크워스" },
  { text: "지금 포기하면 어제의 노력이 아깝다.", author: "토마스 에디슨" },
  { text: "느려도 괜찮아, 멈추지만 않으면.", author: "공자" },
  { text: "할 수 있다고 믿는 순간 이미 반은 이룬 것.", author: "테어도어 루스벨트" },
  { text: "가장 좋은 시작은 지금이다.", author: "마크 트웨인" },
  { text: "어제보다 나은 오늘, 그것으로 충분하다.", author: "파울로 코엘료" },
  { text: "힘들 때 한 걸음 더가 진짜 실력이 된다.", author: "마이클 조던" },
  { text: "목표를 적으면 현실이 된다.", author: "브라이언 트레이시" },
  { text: "실패는 성공의 연습이다.", author: "헨리 포드" },
  { text: "집중한 1시간이 멍한 5시간보다 낫다.", author: "빌 게이츠" },
  { text: "잘하는 사람도 처음엔 못했다.", author: "마이클 조던" },
  { text: "매일 1%씩 성장하면 1년 후엔 37배.", author: "제임스 클리어" },
  { text: "지금 이 순간이 가장 젊은 나다.", author: "공자" },
  { text: "완벽하지 않아도 돼, 시작만 하면 돼.", author: "마크 저커버그" },
  { text: "시간은 누구에게나 공평하다. 차이는 사용법.", author: "랜디 포시" },
  { text: "꿈꾸는 것만으로는 부족해, 실행하자.", author: "월트 디즈니" },
  { text: "포기는 습관이고, 끈기도 습관이다.", author: "빈스 롬바르디" },
  { text: "남과 비교 말고, 어제의 나와 비교하자.", author: "조던 피터슨" },
  { text: "지금 읽는 이 한 줄이 미래를 바꾼다.", author: "짐 론" },
  { text: "오늘의 땀이 내일의 자신감이 된다.", author: "아놀드 슈워제네거" },
  { text: "어려운 문제일수록 풀었을 때 기쁨이 크다.", author: "알베르트 아인슈타인" },
  { text: "지치면 쉬어도 돼, 포기만 하지 마.", author: "안철수" },
  { text: "합격의 차이는 결국 꾸준함이다.", author: "마이클 펠프스" },
  { text: "해야 할 일을 미루지 마, 미래의 내가 고마워할 거야.", author: "나이키" },
  { text: "공부하는 이유가 분명하면 포기할 수 없다.", author: "사이먼 시넥" },
  { text: "내가 나를 믿어야 세상도 나를 믿는다.", author: "오프라 윈프리" },
  { text: "남들이 쉴 때 한 페이지 더.", author: "코비 브라이언트" },
  { text: "공부는 미래의 나에게 주는 가장 큰 선물.", author: "에이브러햄 링컨" },
  { text: "잘하는 사람은 더 잘하려 하고, 못하는 사람은 포기한다.", author: "캐럴 드웩" },
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
          {user && nickname ? `${nickname}님,` : '매일 조금씩,'}<br />공들여 쌓아가요
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
