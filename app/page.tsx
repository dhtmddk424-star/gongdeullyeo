'use client'
export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', padding: '0 2rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45' }}>공들여 📖</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => window.location.href='/planner'}>플래너</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => window.location.href='/community'}>커뮤니티</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => window.location.href='/store'}>자료</span>
          <button onClick={() => window.location.href='/login'} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>시작하기</button>
        </div>
      </nav>

      <section style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '500', color: '#4A3728', marginBottom: '16px' }}>
          매일 조금씩,<br />공들여 쌓아가요
        </h1>
        <p style={{ fontSize: '16px', color: '#9A8A78', marginBottom: '32px', lineHeight: '1.7' }}>
          오늘의 목표를 세우고, 함께 인증하고,<br />성장을 눈으로 확인하세요.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => window.location.href='/login'} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px 28px', fontSize: '15px', cursor: 'pointer' }}>무료로 시작하기</button>
          <button onClick={() => window.location.href='/community'} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '24px', padding: '12px 28px', fontSize: '15px', cursor: 'pointer' }}>둘러보기</button>
        </div>
      </section>
    </main>
  )
}