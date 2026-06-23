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
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (p?.nickname) setNickname(p.nickname)
      const { data: dd } = await supabase.from('ddays').select('*').eq('user_id', user.id).order('target_date')
      setDdays(dd || [])
      const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user.id).order('sort_order')
      setSubjects(subs || [])
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

  const addSubject = async () => {
    if (!newSubjectName.trim() || !user) return
    const colors = ['#C9A882', '#8BA88E', '#7B9EBF', '#C4869B', '#B8A06B', '#9B8EC4', '#C47E5A']
    const color = colors[subjects.length % colors.length]
    const { data } = await supabase.from('subjects').insert({ user_id: user.id, name: newSubjectName.trim(), color, sort_order: subjects.length }).select()
    if (data) setSubjects([...subjects, data[0]])
    setNewSubjectName('')
    setShowSubjectForm(false)
  }

  const deleteSubject = async (id) => {
    await supabase.from('subjects').delete().eq('id', id)
    setSubjects(subjects.filter(s => s.id !== id))
    if (selectedSubject === id) setSelectedSubject(null)
  }

  const addGoal = async () => {
    if (!newGoal.trim() || !user) return
    const { data } = await supabase.from('goals').insert({ user_id: user.id, text: newGoal, done: false, date: selectedDate, subject_id: selectedSubject }).select()
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
      quote: '다시 시작하는 마음가짐으로',
      studyTime: totalMin > 0 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : '',
      showTime: totalMin > 0,
      selectedDday: ddays.length > 0 ? ddays[0] : null,
      version: 1,
      showFeedback: !!feedback,
    })
    setShowExport(true)
  }

  const getDdayText = (d) => {
    if (!d) return ''
    const today = new Date(); today.setHours(0,0,0,0)
    const target = new Date(d.target_date + 'T00:00:00')
    const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    return diff === 0 ? 'D-DAY' : diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`
  }

  const downloadCard = async () => {
    const el = document.getElementById('card-preview')
    if (!el) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#3A2E22' })
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

        {/* 과목 탭 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span onClick={() => setSelectedSubject(null)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '14px', cursor: 'pointer', background: selectedSubject === null ? '#4A3728' : '#fff', color: selectedSubject === null ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>전체</span>
          {subjects.map(s => (
            <span key={s.id} onClick={() => setSelectedSubject(selectedSubject === s.id ? null : s.id)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '14px', cursor: 'pointer', background: selectedSubject === s.id ? s.color : '#fff', color: selectedSubject === s.id ? '#fff' : s.color, border: `1px solid ${s.color}`, position: 'relative' }}>
              {s.name}
              {selectedSubject === s.id && <span onClick={(e) => { e.stopPropagation(); deleteSubject(s.id) }} style={{ marginLeft: '6px', fontSize: '10px' }}>×</span>}
            </span>
          ))}
          {showSubjectForm ? (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubject()} placeholder="과목명" autoFocus style={{ width: '80px', padding: '5px 8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '12px', outline: 'none', color: '#4A3728' }} />
              <span onClick={addSubject} style={{ fontSize: '12px', color: '#C9A882', cursor: 'pointer' }}>추가</span>
              <span onClick={() => { setShowSubjectForm(false); setNewSubjectName('') }} style={{ fontSize: '12px', color: '#C4B8A8', cursor: 'pointer' }}>취소</span>
            </div>
          ) : (
            <span onClick={() => setShowSubjectForm(true)} style={{ fontSize: '14px', color: '#C9A882', cursor: 'pointer', width: '26px', height: '26px', borderRadius: '50%', border: '1px dashed #C9A882', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
          )}
        </div>

        {/* 목표 */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
          {goals.filter(g => !selectedSubject || g.subject_id === selectedSubject).length === 0 && <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '1rem 0' }}>목표를 추가해보세요!</p>}
          {goals.filter(g => !selectedSubject || g.subject_id === selectedSubject).map(goal => (
            <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid #F0EAE0' }}>
              <div onClick={() => toggleGoal(goal)} style={{ width: '20px', height: '20px', borderRadius: '6px', border: goal.done ? 'none' : '0.5px solid #D4C8B8', background: goal.done ? '#C9A882' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {goal.done && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '14px', color: goal.done ? '#C4B8A8' : '#4A3728', textDecoration: goal.done ? 'line-through' : 'none' }}>{goal.text}</span>
                {goal.subject_id && (() => { const s = subjects.find(s => s.id === goal.subject_id); return s ? <span style={{ fontSize: '10px', color: s.color, marginLeft: '6px', border: `0.5px solid ${s.color}`, borderRadius: '6px', padding: '1px 5px' }}>{s.name}</span> : null })()}
              </div>
              <span onClick={() => deleteGoal(goal.id)} style={{ fontSize: '16px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {subjects.length > 0 && (
            <select value={selectedSubject || ''} onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)} style={{ padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '13px', color: '#4A3728', outline: 'none', background: '#fff' }}>
              <option value="">분류 없음</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
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
      {showExport && (() => {
        const dateObj = new Date(selectedDate + 'T00:00:00')
        const dateStr = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
        const doneCount = goals.filter(g => g.done).length
        const pct = goals.length ? Math.round((doneCount / goals.length) * 100) : 0
        const streakCount = 0
        const grouped = {}
        goals.forEach(g => {
          const sub = subjects.find(s => s.id === g.subject_id)
          const key = sub ? sub.name : '기타'
          if (!grouped[key]) grouped[key] = { goals: [], color: sub?.color || '#9A8A78' }
          grouped[key].goals.push(g)
        })

        return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', overflow: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '1rem 0' }}>
            {/* 옵션 */}
            <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '1rem', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#4A3728', margin: 0 }}>카드 만들기</h2>
                <span onClick={() => setShowExport(false)} style={{ fontSize: '18px', color: '#9A8A78', cursor: 'pointer' }}>×</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <span onClick={() => setExportData({...exportData, version: 1})} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', cursor: 'pointer', background: exportData.version === 1 ? '#4A3728' : '#fff', color: exportData.version === 1 ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>버전1 체크리스트</span>
                <span onClick={() => setExportData({...exportData, version: 2})} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', cursor: 'pointer', background: exportData.version === 2 ? '#4A3728' : '#fff', color: exportData.version === 2 ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>버전2 +타임테이블</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>
                  <label style={{ color: '#6B5B45', display: 'block', marginBottom: '4px' }}>D-day</label>
                  <select value={exportData.selectedDday?.id || ''} onChange={(e) => setExportData({...exportData, selectedDday: ddays.find(d=>d.id===Number(e.target.value)) || null})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '0.5px solid #E8E0D4', fontSize: '12px', color: '#4A3728', outline: 'none' }}>
                    <option value="">없음</option>
                    {ddays.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <label style={{ color: '#6B5B45' }}>공부시간</label>
                    <label style={{ color: '#C4B8A8', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}><input type="checkbox" checked={exportData.showTime} onChange={(e)=>setExportData({...exportData, showTime: e.target.checked})} style={{ width: '12px', height: '12px' }} /></label>
                  </div>
                  {exportData.showTime && <input value={exportData.studyTime} onChange={(e)=>setExportData({...exportData, studyTime: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '0.5px solid #E8E0D4', fontSize: '12px', color: '#4A3728', outline: 'none', boxSizing: 'border-box' }} />}
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <label style={{ color: '#6B5B45', display: 'block', marginBottom: '4px' }}>명언</label>
                <input value={exportData.quote} onChange={(e)=>setExportData({...exportData, quote: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '0.5px solid #E8E0D4', fontSize: '12px', color: '#4A3728', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <label style={{ color: '#6B5B45', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={exportData.showFeedback} onChange={(e)=>setExportData({...exportData, showFeedback: e.target.checked})} style={{ width: '12px', height: '12px' }} /> 오늘의 피드백 표시
                </label>
              </div>
            </div>

            {/* 미리보기 카드 */}
            <div id="card-preview" style={{ background: '#3A2E22', borderRadius: '16px', padding: '20px', fontFamily: 'sans-serif' }}>
              <div style={{ background: '#FAF7F2', borderRadius: '12px', overflow: 'hidden' }}>
                {/* 헤더 */}
                <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '14px', color: '#4A3728' }}>{dateStr}</div>
                  <div style={{ fontSize: '13px', color: '#C9A882', fontWeight: '600' }}>🔥 연속 출석</div>
                </div>

                {/* 명언 + 통계 */}
                <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9A8A78', marginBottom: '4px' }}>오늘도 공들여</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#4A3728', lineHeight: '1.4', maxWidth: '200px' }}>{exportData.quote}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {exportData.showTime && exportData.studyTime && (
                      <div style={{ background: '#fff', border: '0.5px solid #E8E0D4', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#9A8A78' }}>공부 시간</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#4A3728' }}>{exportData.studyTime}</div>
                      </div>
                    )}
                    <div style={{ background: '#fff', border: '0.5px solid #E8E0D4', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#9A8A78' }}>달성률</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#4A3728' }}>{pct}%</div>
                    </div>
                    {exportData.selectedDday && (
                      <div style={{ background: '#4A3728', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: '#C9A882' }}>D-DAY</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{getDdayText(exportData.selectedDday)}</div>
                        <div style={{ fontSize: '8px', color: '#C9A882' }}>{exportData.selectedDday.title}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 과목별 체크리스트 */}
                <div style={{ padding: '0 20px 16px' }}>
                  {Object.entries(grouped).map(([name, { goals: gList, color }]) => {
                    const done = gList.filter(g => g.done).length
                    return (
                      <div key={name} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #E8E0D4', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#4A3728' }}>{name}</span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#9A8A78' }}>{done}/{gList.length}</span>
                        </div>
                        {gList.map(g => (
                          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '12px' }}>
                            <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: g.done ? '#C9A882' : '#fff', border: g.done ? 'none' : '1px solid #D4C8B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', flexShrink: 0 }}>
                              {g.done && '✓'}
                            </span>
                            <span style={{ color: g.done ? '#C4B8A8' : '#4A3728', textDecoration: g.done ? 'line-through' : 'none', flex: 1 }}>{g.text}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {/* 피드백 */}
                {exportData.showFeedback && feedback && (
                  <div style={{ padding: '12px 20px', borderTop: '0.5px solid #E8E0D4' }}>
                    <div style={{ fontSize: '11px', color: '#9A8A78', marginBottom: '4px' }}>오늘의 한마디</div>
                    <div style={{ fontSize: '12px', color: '#4A3728', lineHeight: '1.6', fontStyle: 'italic' }}>"{feedback}"</div>
                  </div>
                )}

                {/* 하단 */}
                <div style={{ padding: '8px 20px 12px', textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#C9A882' }}>공들여</span>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={downloadCard} style={{ flex: 1, background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '12px', fontSize: '14px', cursor: 'pointer' }}>이미지 저장</button>
              <button onClick={() => {
                setShowExport(false)
                const text = `${dateObj.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 공부 인증! ${doneCount}/${goals.length} 완료`
                router.push(`/community?post=${encodeURIComponent(text)}`)
              }} style={{ flex: 1, background: '#6B5B45', color: '#fff', border: 'none', borderRadius: '20px', padding: '12px', fontSize: '14px', cursor: 'pointer' }}>인증글 올리기</button>
            </div>
          </div>
        </div>
        )
      })()}
    </main>
  )
}
