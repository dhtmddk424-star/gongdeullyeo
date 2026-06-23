'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Planner() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [goals, setGoals] = useState([])
  const [newGoal, setNewGoal] = useState('')
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [feedback, setFeedback] = useState('')
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState({})
  const [ddays, setDdays] = useState([])
  const [showExport, setShowExport] = useState(false)
  const [exportData, setExportData] = useState({ quote: '', studyTime: '', showTime: true, selectedDday: null })
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (p?.nickname) setNickname(p.nickname)
      const { data: dd } = await supabase.from('ddays').select('*').eq('user_id', user.id).order('target_date')
      setDdays(dd || [])
    }
    getUser()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchGoals(user.id, selectedDate)
      fetchFeedback(user.id, selectedDate)
      fetchSessions(user.id, selectedDate)
    }
  }, [user, selectedDate])

  useEffect(() => {
    if (user && showCalendar) fetchCalendarData(user.id)
  }, [user, showCalendar, calendarMonth])

  const fetchGoals = async (userId, date) => {
    const { data } = await supabase.from('goals').select('*').eq('user_id', userId).eq('date', date).order('created_at')
    setGoals(data || [])
    setLoading(false)
  }

  const fetchSessions = async (userId, date) => {
    const { data } = await supabase.from('study_sessions').select('*').eq('user_id', userId).eq('date', date)
    setSessions(data || [])
  }

  const fetchFeedback = async (userId, date) => {
    const { data } = await supabase.from('daily_feedback').select('*').eq('user_id', userId).eq('date', date).single()
    setFeedback(data?.feedback || '')
  }

  const fetchCalendarData = async (userId) => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const [goalsRes, streakRes, sessionsRes] = await Promise.all([
      supabase.from('goals').select('date, done').eq('user_id', userId).gte('date', firstDay).lte('date', lastDay),
      supabase.from('streaks').select('date').eq('user_id', userId).gte('date', firstDay).lte('date', lastDay),
      supabase.from('study_sessions').select('date, duration_minutes').eq('user_id', userId).gte('date', firstDay).lte('date', lastDay),
    ])

    const data = {}
    const streakDates = new Set((streakRes.data || []).map(s => s.date))
    ;(goalsRes.data || []).forEach(g => {
      if (!data[g.date]) data[g.date] = { total: 0, done: 0, minutes: 0, streak: false }
      data[g.date].total++
      if (g.done) data[g.date].done++
    })
    ;(sessionsRes.data || []).forEach(s => {
      if (!data[s.date]) data[s.date] = { total: 0, done: 0, minutes: 0, streak: false }
      data[s.date].minutes += s.duration_minutes
    })
    Object.keys(data).forEach(d => { data[d].streak = streakDates.has(d) })
    streakDates.forEach(d => { if (!data[d]) data[d] = { total: 0, done: 0, minutes: 0, streak: true } })
    setCalendarData(data)
  }

  const toggleGoal = async (goal) => {
    const newDone = !goal.done
    await supabase.from('goals').update({ done: newDone }).eq('id', goal.id)
    const updated = goals.map(g => g.id === goal.id ? { ...g, done: newDone } : g)
    setGoals(updated)
    // #7: 하나라도 체크하면 자동 출석
    if (newDone && user) {
      const today = new Date().toISOString().split('T')[0]
      if (selectedDate === today) {
        await supabase.from('streaks').upsert({ user_id: user.id, date: today }, { onConflict: 'user_id,date' })
      }
    }
  }

  const addGoal = async () => {
    if (!newGoal.trim() || !user) return
    const { data } = await supabase.from('goals').insert({ user_id: user.id, text: newGoal, done: false, date: selectedDate }).select()
    if (data) setGoals([...goals, data[0]])
    setNewGoal('')
  }

  const deleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(goals.filter(g => g.id !== id))
  }

  const saveFeedback = async () => {
    if (!user) return
    await supabase.from('daily_feedback').upsert({ user_id: user.id, date: selectedDate, feedback })
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  const changeDate = (offset) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const openExport = () => {
    const totalMin = sessions.reduce((s, v) => s + v.duration_minutes, 0)
    setExportData({
      quote: '"꾸준함은 재능을 이긴다."',
      studyTime: totalMin > 0 ? `${Math.floor(totalMin / 60)}시간 ${totalMin % 60}분` : '',
      showTime: totalMin > 0,
      selectedDday: ddays.length > 0 ? ddays[0] : null,
    })
    setShowExport(true)
  }

  const generateCard = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = 1080, h = 1350
    canvas.width = w; canvas.height = h

    // 배경
    ctx.fillStyle = '#FAF7F2'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#E8E0D4'; ctx.lineWidth = 3
    ctx.strokeRect(40, 40, w - 80, h - 80)

    // 헤더
    ctx.fillStyle = '#4A3728'; ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('공들여', w / 2, 120)

    const dateObj = new Date(selectedDate + 'T00:00:00')
    const dateStr = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    ctx.fillStyle = '#9A8A78'; ctx.font = '26px sans-serif'
    ctx.fillText(dateStr, w / 2, 165)

    if (nickname) {
      ctx.fillStyle = '#6B5B45'; ctx.font = '24px sans-serif'
      ctx.fillText(`${nickname}님의 하루`, w / 2, 205)
    }

    // 진행도 바
    const pct = goals.length ? Math.round((goals.filter(g => g.done).length / goals.length) * 100) : 0
    ctx.fillStyle = '#F0EAE0'
    ctx.beginPath(); ctx.roundRect(100, 240, w - 200, 24, 12); ctx.fill()
    if (pct > 0) { ctx.fillStyle = '#C9A882'; ctx.beginPath(); ctx.roundRect(100, 240, (w - 200) * pct / 100, 24, 12); ctx.fill() }
    ctx.fillStyle = '#6B5B45'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(`${goals.filter(g => g.done).length}/${goals.length} (${pct}%)`, w - 100, 235)

    // 할일 목록
    ctx.textAlign = 'left'; let y = 300
    goals.slice(0, 14).forEach(goal => {
      if (goal.done) {
        ctx.fillStyle = '#C9A882'; ctx.beginPath(); ctx.roundRect(100, y - 14, 26, 26, 5); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('✓', 106, y + 4)
      } else {
        ctx.strokeStyle = '#D4C8B8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(100, y - 14, 26, 26, 5); ctx.stroke()
      }
      ctx.fillStyle = goal.done ? '#C4B8A8' : '#4A3728'; ctx.font = '24px sans-serif'
      ctx.fillText(goal.text.length > 30 ? goal.text.slice(0, 30) + '...' : goal.text, 140, y + 4)
      y += 44
    })

    // 피드백
    if (feedback) {
      y = Math.max(y + 20, h - 280)
      ctx.fillStyle = '#C9A882'; ctx.globalAlpha = 0.1
      ctx.beginPath(); ctx.roundRect(80, y, w - 160, 80, 12); ctx.fill(); ctx.globalAlpha = 1
      ctx.fillStyle = '#6B5B45'; ctx.font = 'italic 22px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`"${feedback.length > 50 ? feedback.slice(0, 50) + '...' : feedback}"`, w / 2, y + 45)
    }

    // 하단
    ctx.fillStyle = '#D4C8B8'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('gongdeullyeo.vercel.app', w / 2, h - 70)

    // 다운로드
    const link = document.createElement('a')
    link.download = `공들여_${selectedDate}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const doneCount = goals.filter(g => g.done).length
  const dateDisplay = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  // 달력 렌더링
  const renderCalendar = () => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDayOfWeek = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>{isToday ? '오늘의 플래너' : '플래너'}</h1>
          <span onClick={() => { setShowCalendar(!showCalendar); if (!showCalendar && user) fetchCalendarData(user.id) }} style={{ fontSize: '20px', cursor: 'pointer' }} title="달력">📅</span>
        </div>

        {/* 달력 (#6) */}
        {showCalendar && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} style={{ cursor: 'pointer', color: '#9A8A78', padding: '4px 8px' }}>◀</span>
              <span style={{ fontSize: '15px', fontWeight: '500', color: '#4A3728' }}>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</span>
              <span onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} style={{ cursor: 'pointer', color: '#9A8A78', padding: '4px 8px' }}>▶</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <div key={d} style={{ fontSize: '11px', color: '#C4B8A8', padding: '4px 0' }}>{d}</div>
              ))}
              {renderCalendar().map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const d = calendarData[dateStr]
                const hasStreak = d?.streak
                const pct = d?.total > 0 ? Math.round((d.done / d.total) * 100) : 0
                const isSelected = dateStr === selectedDate
                return (
                  <div key={i} onClick={() => { setSelectedDate(dateStr); setShowCalendar(false) }} style={{
                    padding: '6px 2px', borderRadius: '6px', cursor: 'pointer',
                    background: isSelected ? '#C9A882' : hasStreak ? '#F0EAE0' : 'transparent',
                    color: isSelected ? '#fff' : '#4A3728', fontSize: '13px',
                  }}>
                    <div>{day}</div>
                    {d && (
                      <div style={{ fontSize: '9px', color: isSelected ? '#fff' : '#C9A882', marginTop: '2px' }}>
                        {pct > 0 && `${pct}%`}{d.minutes > 0 && ` ${Math.round(d.minutes / 60)}h`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <span onClick={() => changeDate(-1)} style={{ fontSize: '18px', color: '#9A8A78', cursor: 'pointer', padding: '4px 8px' }}>◀</span>
          <span style={{ fontSize: '14px', color: '#9A8A78', flex: 1, textAlign: 'center' }}>{dateDisplay}</span>
          <span onClick={() => changeDate(1)} style={{ fontSize: '18px', color: '#9A8A78', cursor: 'pointer', padding: '4px 8px' }}>▶</span>
          {!isToday && <span onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} style={{ fontSize: '12px', color: '#C9A882', cursor: 'pointer', border: '0.5px solid #C9A882', borderRadius: '12px', padding: '4px 10px' }}>오늘</span>}
        </div>

        {/* 진행도 */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>진행도</span>
            <span style={{ fontSize: '13px', color: '#C9A882', fontWeight: '500' }}>{doneCount}/{goals.length}</span>
          </div>
          <div style={{ background: '#F0EAE0', borderRadius: '4px', height: '8px' }}>
            <div style={{ background: '#C9A882', borderRadius: '4px', height: '8px', width: goals.length ? `${(doneCount / goals.length) * 100}%` : '0%', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* 목표 */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
          {goals.length === 0 && <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '1rem 0' }}>목표를 추가해보세요!</p>}
          {goals.map(goal => (
            <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid #F0EAE0' }}>
              <div onClick={() => toggleGoal(goal)} style={{ width: '20px', height: '20px', borderRadius: '6px', border: goal.done ? 'none' : '0.5px solid #D4C8B8', background: goal.done ? '#C9A882' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {goal.done && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
              </div>
              <span style={{ flex: 1, fontSize: '14px', color: goal.done ? '#C4B8A8' : '#4A3728', textDecoration: goal.done ? 'line-through' : 'none' }}>{goal.text}</span>
              <span onClick={() => deleteGoal(goal.id)} style={{ fontSize: '16px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGoal()} placeholder="새 목표 추가..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#fff' }} />
          <button onClick={addGoal} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', cursor: 'pointer' }}>추가</button>
        </div>

        {/* 피드백 (#11 저장 버튼 안에) */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>오늘의 피드백</span>
            <button onClick={saveFeedback} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '14px', padding: '4px 14px', fontSize: '12px', cursor: 'pointer' }}>
              {savedFeedback ? '저장됨 ✓' : '저장'}
            </button>
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="오늘 공부는 어땠나요? 한두줄 기록해보세요"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#FAF7F2', resize: 'none', height: '60px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
          />
        </div>

        {/* 이미지 저장 버튼 */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={openExport} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px 28px', fontSize: '14px', cursor: 'pointer' }}>
            이미지 저장
          </button>
        </div>
      </section>

      {/* 이미지 저장 팝업 */}
      {showExport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FAF7F2', borderRadius: '16px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#4A3728', margin: 0 }}>인스타 카드 만들기</h2>
              <span onClick={() => setShowExport(false)} style={{ fontSize: '20px', color: '#9A8A78', cursor: 'pointer' }}>×</span>
            </div>

            {/* D-day 선택 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#6B5B45', fontWeight: '500', display: 'block', marginBottom: '6px' }}>D-day (선택)</label>
              <select value={exportData.selectedDday?.id || ''} onChange={(e) => {
                const d = ddays.find(dd => dd.id === Number(e.target.value))
                setExportData({ ...exportData, selectedDday: d || null })
              }} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '13px', color: '#4A3728', outline: 'none' }}>
                <option value="">없음</option>
                {ddays.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>

            {/* 명언 수정 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#6B5B45', fontWeight: '500', display: 'block', marginBottom: '6px' }}>명언</label>
              <input value={exportData.quote} onChange={(e) => setExportData({ ...exportData, quote: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '13px', color: '#4A3728', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* 공부 시간 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', color: '#6B5B45', fontWeight: '500' }}>공부 시간</label>
                <label style={{ fontSize: '11px', color: '#9A8A78', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={exportData.showTime} onChange={(e) => setExportData({ ...exportData, showTime: e.target.checked })} /> 표시
                </label>
              </div>
              {exportData.showTime && (
                <input value={exportData.studyTime} onChange={(e) => setExportData({ ...exportData, studyTime: e.target.value })} placeholder="예: 3시간 30분" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '13px', color: '#4A3728', outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>

            {/* 미리보기 정보 */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #E8E0D4', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#9A8A78' }}>
              <div>날짜: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
              <div>할일: {goals.length}개 (완료 {goals.filter(g => g.done).length}개)</div>
              {feedback && <div>피드백: {feedback.slice(0, 30)}{feedback.length > 30 ? '...' : ''}</div>}
              {exportData.selectedDday && <div>D-day: {exportData.selectedDday.title}</div>}
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { generateCard(); setShowExport(false) }} style={{ flex: 1, background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px', fontSize: '14px', cursor: 'pointer' }}>
                이미지 저장
              </button>
              <button onClick={() => {
                generateCard()
                setShowExport(false)
                const dateStr = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                const text = `${dateStr} 공부 인증! ${goals.filter(g=>g.done).length}/${goals.length} 완료`
                router.push(`/community?post=${encodeURIComponent(text)}`)
              }} style={{ flex: 1, background: '#6B5B45', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px', fontSize: '14px', cursor: 'pointer' }}>
                인증글 올리기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
