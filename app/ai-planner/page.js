'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { checkPremium } from '../../lib/subscription'

export default function AiPlanner() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const premium = await checkPremium(user.id)
      setIsPremium(premium)
      if (!premium) { router.push('/subscribe'); return }
      setLoading(false)
    }
    load()
  }, [router])

  const handleParse = async () => {
    if (!file) return
    setParsing(true)
    // AI 파싱 로직 (추후 Anthropic API 연동)
    setTimeout(() => {
      setResult({
        message: 'AI 플래너 파싱은 곧 활성화됩니다!',
        description: 'Anthropic Claude API와 연동하여 PDF/이미지에서 학습 계획을 자동으로 추출하고, 날짜별 할일 목록을 생성합니다.'
      })
      setParsing(false)
    }, 2000)
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', padding: '0 2rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45', cursor: 'pointer' }} onClick={() => router.push('/')}>공들여 📖</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/planner')}>플래너</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>대시보드</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>로그아웃</button>
        </div>
      </nav>

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>AI 학습 플래너</h1>
          <span style={{ background: '#C9A882', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>프리미엄</span>
        </div>
        <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '2rem' }}>학습 계획표를 업로드하면 AI가 날짜별 할일을 자동 생성해요</p>

        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '2rem', textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>

          {!file ? (
            <>
              <p style={{ fontSize: '14px', color: '#6B5B45', marginBottom: '16px' }}>PDF, 이미지, 텍스트 파일을 업로드하세요</p>
              <button onClick={() => fileRef.current.click()} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}>파일 선택</button>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
            </>
          ) : (
            <>
              <p style={{ fontSize: '14px', color: '#4A3728', marginBottom: '4px' }}>📎 {file.name}</p>
              <p style={{ fontSize: '12px', color: '#C4B8A8', marginBottom: '16px' }}>{(file.size / 1024).toFixed(1)} KB</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button onClick={() => setFile(null)} style={{ background: '#F0EAE0', color: '#9A8A78', border: 'none', borderRadius: '20px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>다시 선택</button>
                <button onClick={handleParse} disabled={parsing} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}>
                  {parsing ? 'AI 분석 중...' : 'AI로 분석하기'}
                </button>
              </div>
            </>
          )}
        </div>

        {result && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '15px', color: '#4A3728', marginBottom: '8px' }}>{result.message}</h3>
            <p style={{ fontSize: '13px', color: '#9A8A78', lineHeight: '1.7' }}>{result.description}</p>
          </div>
        )}

        <div style={{ background: '#FAF0E4', borderRadius: '12px', padding: '1.25rem', marginTop: '16px' }}>
          <h3 style={{ fontSize: '14px', color: '#6B5B45', marginBottom: '8px' }}>이런 파일을 업로드하세요</h3>
          <ul style={{ fontSize: '13px', color: '#9A8A78', paddingLeft: '20px', margin: 0, lineHeight: '2' }}>
            <li>학원/인강 커리큘럼 캡처</li>
            <li>Claude로 만든 학습 계획표 PDF</li>
            <li>시험 범위 정리 문서</li>
            <li>직접 작성한 목표 리스트</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
