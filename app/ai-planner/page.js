'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { checkPremium } from '../../lib/subscription'
import Nav from '../components/Nav'

export default function AiPlanner() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
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
    if (!textInput.trim() && !file) { setError('내용을 입력하거나 파일을 업로드해주세요.'); return }

    setParsing(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('text', textInput.trim())
      if (file) formData.append('file', file)

      const res = await fetch('/api/ai-parse', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else if (data.result) {
        setResult(data.result)
      } else {
        setError('분석 결과를 처리할 수 없습니다. 다시 시도해주세요.')
      }
    } catch (e) {
      setError('서버 오류가 발생했습니다.')
    }
    setParsing(false)
  }

  const saveToPlanner = async () => {
    if (!result || !user) return
    setSaving(true)

    const subjectMap = {}
    if (result.subjects) {
      const colors = ['#C9A882', '#8BA88E', '#7B9EBF', '#C4869B', '#B8A06B', '#9B8EC4', '#C47E5A']
      for (let i = 0; i < result.subjects.length; i++) {
        const name = result.subjects[i]
        const { data } = await supabase.from('subjects').select('id').eq('user_id', user.id).eq('name', name).single()
        if (data) {
          subjectMap[name] = data.id
        } else {
          const { data: newSub } = await supabase.from('subjects').insert({ user_id: user.id, name, color: colors[i % colors.length], sort_order: i }).select()
          if (newSub) subjectMap[name] = newSub[0].id
        }
      }
    }

    let count = 0
    if (result.days) {
      for (const day of result.days) {
        for (const task of day.tasks) {
          await supabase.from('goals').insert({
            user_id: user.id,
            text: task.text,
            done: false,
            date: day.date,
            subject_id: subjectMap[task.subject] || null
          })
          count++
        }
      }
    }

    setSaving(false)
    alert(`${count}개의 할일이 플래너에 추가되었어요!`)
    router.push('/planner')
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>AI 학습 도우미</h1>
          <span style={{ background: '#C9A882', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>프리미엄</span>
        </div>
        <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '2rem' }}>학습 계획표를 입력하면 AI가 날짜별 할일을 자동 생성해요</p>

        {/* 입력 방법 */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem', marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', display: 'block', marginBottom: '8px' }}>학습 계획 내용</label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={"학습 계획이나 커리큘럼을 붙여넣어 주세요.\n\n예시:\n수능 D-100 영어 계획\n1주차: 단어 암기 500개, 독해 지문 10개\n2주차: 문법 정리, 모의고사 1회\n...\n\n또는 Claude에게 만든 학습 계획표를 복사해 붙여넣으세요."}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#FAF7F2', resize: 'vertical', minHeight: '150px', boxSizing: 'border-box', fontFamily: 'sans-serif', lineHeight: '1.6' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => fileRef.current.click()} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '16px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>
                {file ? `📎 ${file.name}` : '📎 파일 첨부'}
              </button>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
              {file && <span onClick={() => setFile(null)} style={{ fontSize: '12px', color: '#C4B8A8', cursor: 'pointer' }}>×</span>}
            </div>
            <button onClick={handleParse} disabled={parsing || (!textInput.trim() && !file)} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', opacity: (parsing || (!textInput.trim() && !file)) ? 0.5 : 1 }}>
              {parsing ? 'AI 분석 중...' : 'AI로 분석하기'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FFF0F0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#C44' }}>{error}</div>
        )}

        {/* 결과 */}
        {result && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', color: '#4A3728', marginBottom: '12px' }}>분석 결과</h3>

            {result.subjects && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {result.subjects.map(s => (
                  <span key={s} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', background: '#FAF7F2', color: '#6B5B45', border: '0.5px solid #E8E0D4' }}>{s}</span>
                ))}
              </div>
            )}

            {result.days && result.days.map((day, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#C9A882', marginBottom: '6px' }}>{day.date}</div>
                {day.tasks.map((t, j) => (
                  <div key={j} style={{ display: 'flex', gap: '8px', padding: '4px 0', fontSize: '13px' }}>
                    <span style={{ color: '#C9A882', flexShrink: 0 }}>•</span>
                    <span style={{ color: '#9A8A78', fontSize: '11px', minWidth: '40px' }}>{t.subject}</span>
                    <span style={{ color: '#4A3728' }}>{t.text}</span>
                  </div>
                ))}
              </div>
            ))}

            <button onClick={saveToPlanner} disabled={saving} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>
              {saving ? '저장 중...' : '플래너에 추가하기'}
            </button>
          </div>
        )}

        <div style={{ background: '#FAF0E4', borderRadius: '12px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '14px', color: '#6B5B45', marginBottom: '8px' }}>이렇게 활용하세요</h3>
          <ul style={{ fontSize: '13px', color: '#9A8A78', paddingLeft: '20px', margin: 0, lineHeight: '2' }}>
            <li>Claude에게 학습 계획표를 만들어달라고 요청</li>
            <li>받은 내용을 복사해서 위에 붙여넣기</li>
            <li>AI가 과목별, 날짜별로 자동 분류</li>
            <li>[플래너에 추가하기]로 한번에 등록</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
