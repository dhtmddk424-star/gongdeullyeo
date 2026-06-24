'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getTodayQuote, getQuoteByDate } from '../../lib/quotes'
import { getToday } from '../../lib/today'
import Nav from '../components/Nav'

export default function Planner() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [goals, setGoals] = useState([])
  const [newGoal, setNewGoal] = useState('')
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [feedback, setFeedback] = useState('')
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState({})
  const [ddays, setDdays] = useState([])
  const [showExport, setShowExport] = useState(false)
  const [exportData, setExportData] = useState({ quote: '', studyTime: '', showTime: true, selectedDday: null })
  const [cardGoals, setCardGoals] = useState([])
  const [showCardEdit, setShowCardEdit] = useState(false)
  const [sessions, setSessions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [assigningGoalId, setAssigningGoalId] = useState(null)
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [editGoalText, setEditGoalText] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) { setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (p?.nickname) setNickname(p.nickname)
      const { data: dd } = await supabase.from('ddays').select('*').eq('user_id', user.id).order('target_date')
      setDdays(dd || [])
      const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user.id).order('sort_order')
      setSubjects(subs || [])
    }
    getUser()
    setSelectedDate(getToday())
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
    if (requireLogin()) return
    const newDone = !goal.done
    await supabase.from('goals').update({ done: newDone }).eq('id', goal.id)
    const updated = goals.map(g => g.id === goal.id ? { ...g, done: newDone } : g)
    setGoals(updated)
    // #7: 하나라도 체크하면 자동 출석
    if (newDone && user) {
      const td = getToday()
      if (selectedDate === td) {
        await supabase.from('streaks').upsert({ user_id: user.id, date: td }, { onConflict: 'user_id,date' })
      }
    }
  }

  const addSubject = async () => {
    if (!newSubjectName.trim() || !user) return
    const allColors = ['#C9A882', '#7B9EBF', '#C4869B', '#8BA88E', '#B8A06B', '#9B8EC4', '#C47E5A']
    const usedColors = new Set(subjects.map(s => s.color))
    const color = allColors.find(c => !usedColors.has(c)) || allColors[subjects.length % allColors.length]
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
    if (requireLogin()) return
    if (!newGoal.trim()) return
    const { data } = await supabase.from('goals').insert({ user_id: user.id, text: newGoal, done: false, date: selectedDate, subject_id: selectedSubject }).select()
    if (data) setGoals([...goals, data[0]])
    setNewGoal('')
  }

  const saveGoalEdit = async (id) => {
    if (!editGoalText.trim()) return
    await supabase.from('goals').update({ text: editGoalText.trim() }).eq('id', id)
    setGoals(goals.map(g => g.id === id ? { ...g, text: editGoalText.trim() } : g))
    setEditingGoalId(null)
  }

  const deleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(goals.filter(g => g.id !== id))
  }

  const updateGoalSubject = async (goalId, subjectId) => {
    await supabase.from('goals').update({ subject_id: subjectId || null }).eq('id', goalId)
    setGoals(goals.map(g => g.id === goalId ? { ...g, subject_id: subjectId || null } : g))
  }

  const saveFeedback = async () => {
    if (requireLogin()) return
    await supabase.from('daily_feedback').upsert({ user_id: user.id, date: selectedDate, feedback }, { onConflict: 'user_id,date' })
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  const changeDate = (offset) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const openExport = async () => {
    if (user) {
      const { data: fb } = await supabase.from('daily_feedback').select('feedback').eq('user_id', user.id).eq('date', selectedDate).single()
      if (fb?.feedback) setFeedback(fb.feedback)
    }
    const totalMin = sessions.reduce((s, v) => s + v.duration_minutes, 0)
    const q = getQuoteByDate(selectedDate)
    // fetch streak count
    let streakNum = 0
    if (user) {
      const { data: allStreaks } = await supabase.from('streaks').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(365)
      if (allStreaks && allStreaks.length > 0) {
        const d = new Date()
        for (const s of allStreaks) {
          if (s.date === d.toISOString().split('T')[0]) { streakNum++; d.setDate(d.getDate() - 1) } else break
        }
      }
    }
    setExportData({
      quote: q.text,
      studyTime: totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : `${totalMin}m`,
      showTime: true,
      showDday: ddays.length > 0,
      selectedDday: ddays.length > 0 ? ddays[0] : null,
      design: 1,
      showFeedback: !!feedback,
      showRate: false,
      streakCount: streakNum,
    })
    setCardGoals(goals.map(g => ({ ...g, cardText: g.text })))
    setShowExport(true)
  }

  const getDdayText = (d) => {
    if (!d) return ''
    const today = new Date(); today.setHours(0,0,0,0)
    const target = new Date(d.target_date + 'T00:00:00')
    const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    return diff === 0 ? 'D-DAY' : diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`
  }

  const getCardCanvas = async () => {
    const el = document.getElementById('card-preview')
    if (!el) return null
    const html2canvas = (await import('html2canvas')).default
    return await html2canvas(el, { scale: 2, backgroundColor: '#3A2E22', useCORS: true })
  }

  const downloadCard = async () => {
    const canvas = await getCardCanvas()
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `공로그_${selectedDate}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const postToFeed = async () => {
    const canvas = await getCardCanvas()
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob || !user) return
      const fileName = `card-${user.id}-${Date.now()}.png`
      await supabase.storage.from('posts').upload(fileName, blob)
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName)
      setShowExport(false)
      router.push(`/community?image=${encodeURIComponent(urlData.publicUrl)}`)
    }, 'image/png')
  }

  const isToday = selectedDate === getToday()
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

  const renderBlurText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} style={{ filter: 'blur(5px)', userSelect: 'none' }}>{part.slice(2, -2)}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  const requireLogin = () => {
    if (!user) {
      if (confirm('로그인해야 사용할 수 있어요. 회원가입하러 가시겠어요?')) router.push('/login')
      return true
    }
    return false
  }

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
          {!isToday && <span onClick={() => setSelectedDate(getToday())} style={{ fontSize: '12px', color: '#C9A882', cursor: 'pointer', border: '0.5px solid #C9A882', borderRadius: '12px', padding: '4px 10px' }}>오늘</span>}
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

        {/* 목표 (과목별 정렬, 미분류 맨 아래) */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
          {goals.filter(g => !selectedSubject || g.subject_id === selectedSubject).length === 0 && <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '1rem 0' }}>목표를 추가해보세요!</p>}
          {(() => {
            const filtered = goals.filter(g => !selectedSubject || g.subject_id === selectedSubject)
            const sorted = [...filtered].sort((a, b) => {
              const aIdx = a.subject_id ? subjects.findIndex(s => s.id === a.subject_id) : 999
              const bIdx = b.subject_id ? subjects.findIndex(s => s.id === b.subject_id) : 999
              return aIdx - bIdx
            })
            return sorted.map(goal => {
              const sub = subjects.find(s => s.id === goal.subject_id)
              const isAssigning = assigningGoalId === goal.id
              return (
                <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '0.5px solid #F0EAE0' }}>
                  {/* 분류 태그 앞쪽 */}
                  {sub ? (
                    <span onClick={() => setAssigningGoalId(isAssigning ? null : goal.id)} style={{ fontSize: '10px', color: sub.color, border: `1px solid ${sub.color}`, borderRadius: '6px', padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', background: isAssigning ? '#FAF0E4' : 'transparent' }}>
                      {sub.name}{isAssigning && <span onClick={(e) => { e.stopPropagation(); updateGoalSubject(goal.id, null); setAssigningGoalId(null) }} style={{ color: '#D4C8B8' }}>×</span>}
                    </span>
                  ) : (
                    <span
                      onClick={() => setAssigningGoalId(isAssigning ? null : goal.id)}
                      style={{ width: '20px', height: '20px', borderRadius: '6px', border: '1px dashed #D4C8B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: '10px', color: '#D4C8B8', background: isAssigning ? '#FAF0E4' : 'transparent' }}
                    >+</span>
                  )}
                  {isAssigning && (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {subjects.filter(s => s.id !== goal.subject_id).map(s => (
                        <span key={s.id} onClick={() => { updateGoalSubject(goal.id, s.id); setAssigningGoalId(null) }} style={{ fontSize: '10px', color: '#fff', background: s.color, borderRadius: '6px', padding: '2px 6px', cursor: 'pointer' }}>{s.name}</span>
                      ))}
                    </div>
                  )}
                  <div onClick={() => toggleGoal(goal)} style={{ width: '20px', height: '20px', borderRadius: '6px', border: goal.done ? 'none' : '0.5px solid #D4C8B8', background: goal.done ? '#C9A882' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    {goal.done && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                  </div>
                  {editingGoalId === goal.id ? (
                    <input value={editGoalText} onChange={(e) => setEditGoalText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveGoalEdit(goal.id); if (e.key === 'Escape') setEditingGoalId(null) }} onBlur={() => saveGoalEdit(goal.id)} autoFocus style={{ flex: 1, fontSize: '14px', color: '#4A3728', border: 'none', borderBottom: '1px solid #C9A882', outline: 'none', background: 'transparent', padding: '2px 0' }} />
                  ) : (
                    <span onClick={() => { if (requireLogin()) return; setEditingGoalId(goal.id); setEditGoalText(goal.text) }} style={{ flex: 1, fontSize: '14px', color: goal.done ? '#C4B8A8' : '#4A3728', textDecoration: goal.done ? 'line-through' : 'none', cursor: 'text' }}>{goal.text}</span>
                  )}
                  <span onClick={() => deleteGoal(goal.id)} style={{ fontSize: '16px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
                </div>
              )
            })
          })()}
        </div>

        {/* 할일 추가 (선택된 탭의 과목으로 자동 분류) */}
        <div style={{ marginBottom: '16px' }}>
          {selectedSubject && (() => { const s = subjects.find(s => s.id === selectedSubject); return s ? <div style={{ fontSize: '11px', color: s.color, marginBottom: '4px' }}>▸ {s.name}에 추가됩니다</div> : null })()}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGoal()} placeholder="새 목표 추가..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#fff' }} />
            <button onClick={addGoal} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', cursor: 'pointer' }}>추가</button>
          </div>
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
        const shortDate = dateObj.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
        const dc = goals.filter(g => g.done).length
        const pct = goals.length ? Math.round((dc / goals.length) * 100) : 0
        const grouped = {}
        cardGoals.forEach(g => {
          const sub = subjects.find(s => s.id === g.subject_id)
          const key = sub ? sub.name : '기타'
          if (!grouped[key]) grouped[key] = { goals: [], color: sub?.color || '#9A8A78', isEtc: !sub }
          grouped[key].goals.push(g)
        })
        const hours = Array.from({ length: 19 }, (_, i) => (i + 7) % 24)
        const sessionSlots = {}
        sessions.forEach(s => {
          const endTime = new Date(s.created_at)
          const startTime = new Date(endTime.getTime() - s.duration_minutes * 60000)
          const sub = subjects.find(sb => sb.name === s.subject)
          const color = sub?.color || '#C9A882'
          for (let m = 0; m < s.duration_minutes; m += 5) {
            const t = new Date(startTime.getTime() + m * 60000)
            const h = t.getHours()
            const slot = Math.floor(t.getMinutes() / 5)
            if (!sessionSlots[h]) sessionSlots[h] = {}
            sessionSlots[h][slot] = { subject: s.subject, color }
          }
        })

        const Toggle = ({ checked, onChange, label }) => (
          <label style={{ fontSize: '11px', color: '#6B5B45', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <div onClick={(e) => { e.preventDefault(); onChange(!checked) }} style={{ width: '32px', height: '18px', borderRadius: '9px', background: checked ? '#C9A882' : '#E8E0D4', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
              <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: checked ? '16px' : '2px', transition: 'left 0.2s' }} />
            </div>
            {label}
          </label>
        )

        return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', overflow: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '1rem 0' }}>
            {/* 옵션 */}
            <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '1rem', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#4A3728', margin: 0 }}>카드 만들기</h2>
                <span onClick={() => setShowExport(false)} style={{ fontSize: '18px', color: '#9A8A78', cursor: 'pointer' }}>×</span>
              </div>

              {/* 디자인 선택 */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <span onClick={() => setExportData({...exportData, design: 1})} style={{ flex: 1, textAlign: 'center', fontSize: '12px', padding: '8px', borderRadius: '10px', cursor: 'pointer', background: exportData.design === 1 ? '#4A3728' : '#fff', color: exportData.design === 1 ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>디자인 1<br/><span style={{ fontSize: '10px' }}>심플 카드</span></span>
                <span onClick={() => setExportData({...exportData, design: 2})} style={{ flex: 1, textAlign: 'center', fontSize: '12px', padding: '8px', borderRadius: '10px', cursor: 'pointer', background: exportData.design === 2 ? '#4A3728' : '#fff', color: exportData.design === 2 ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>디자인 2<br/><span style={{ fontSize: '10px' }}>플래너형 + 타임테이블</span></span>
              </div>

              {/* 토글 옵션 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <Toggle checked={exportData.showDday} onChange={(v) => setExportData({...exportData, showDday: v})} label="D-day" />
                <Toggle checked={exportData.showTime} onChange={(v) => setExportData({...exportData, showTime: v})} label="공부시간" />
                <Toggle checked={exportData.showRate} onChange={(v) => setExportData({...exportData, showRate: v})} label="달성률" />
                <Toggle checked={exportData.showFeedback} onChange={(v) => setExportData({...exportData, showFeedback: v})} label="피드백" />
              </div>

              {/* 할일 수정 + 블러 */}
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                <span onClick={() => setShowCardEdit(!showCardEdit)} style={{ color: '#C9A882', cursor: 'pointer', fontSize: '11px' }}>{showCardEdit ? '▾ 할일 수정/블러 접기' : '▸ 할일 수정/블러 펼치기'}</span>
                {showCardEdit && (
                  <div style={{ background: '#FAF7F2', borderRadius: '8px', padding: '6px', marginTop: '4px', maxHeight: '100px', overflow: 'auto' }}>
                    {cardGoals.map((g, i) => (
                      <div key={g.id} style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', color: g.done ? '#C9A882' : '#D4C8B8' }}>{g.done ? '✓' : '○'}</span>
                        <input value={g.cardText} onChange={(e) => { const n = [...cardGoals]; n[i] = { ...n[i], cardText: e.target.value }; setCardGoals(n) }} style={{ flex: 1, padding: '2px 4px', borderRadius: '4px', border: '0.5px solid #E8E0D4', fontSize: '10px', outline: 'none', color: '#4A3728', background: '#fff' }} />
                      </div>
                    ))}
                    <div style={{ fontSize: '9px', color: '#C4B8A8', marginTop: '2px' }}>**텍스트** → 블러 처리</div>
                  </div>
                )}
              </div>

              {/* D-day 선택 */}
              {exportData.showDday && ddays.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {ddays.map(d => (
                    <span key={d.id} onClick={() => setExportData({...exportData, selectedDday: d})} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', cursor: 'pointer', background: exportData.selectedDday?.id === d.id ? '#4A3728' : '#fff', color: exportData.selectedDday?.id === d.id ? '#fff' : '#4A3728', border: '0.5px solid #E8E0D4' }}>{d.title}</span>
                  ))}
                </div>
              )}

              {/* 수정 가능 필드 */}
              <div style={{ fontSize: '12px' }}>
                <div style={{ marginBottom: '6px' }}>
                  <label style={{ color: '#6B5B45', display: 'block', marginBottom: '3px' }}>명언</label>
                  <input value={exportData.quote} onChange={(e)=>setExportData({...exportData, quote: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '0.5px solid #E8E0D4', fontSize: '12px', color: '#4A3728', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {exportData.showTime && (
                  <div>
                    <label style={{ color: '#6B5B45', display: 'block', marginBottom: '3px' }}>공부시간</label>
                    <input value={exportData.studyTime} onChange={(e)=>setExportData({...exportData, studyTime: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '0.5px solid #E8E0D4', fontSize: '12px', color: '#4A3728', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
            </div>

            {/* 미리보기 카드 (4:5 비율) */}
            <div id="card-preview" style={{ background: '#3A2E22', borderRadius: '14px', padding: '14px', fontFamily: 'sans-serif', aspectRatio: '4/5' }}>
              <div style={{ background: '#FAF7F2', borderRadius: '11px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* 헤더 */}
                <div style={{ padding: '12px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E8E0D4' }}>
                  <div style={{ color: '#4A3728', fontSize: '13px', fontWeight: '500' }}>{dateStr}</div>
                  {exportData.streakCount > 0 && <div style={{ color: '#C9A882', fontSize: '13px', fontWeight: '600' }}>🔥 {exportData.streakCount}일 연속</div>}
                </div>

                {/* 명언 + 통계 */}
                <div style={{ padding: '10px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px', borderBottom: '1px solid #E8E0D4' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#C9A882', fontWeight: '600', letterSpacing: '1px', marginBottom: '3px' }}>오늘도 공로그</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#4A3728', lineHeight: '1.4', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{exportData.quote}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    {exportData.showTime && (
                      <div style={{ background: '#F5F0E8', borderRadius: '7px', padding: '5px 9px', textAlign: 'center', minWidth: '44px' }}>
                        <div style={{ fontSize: '8px', color: '#9A8A78', letterSpacing: '0.5px' }}>공부 시간</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#4A3728' }}>{exportData.studyTime}</div>
                      </div>
                    )}
                    {exportData.showRate && (
                      <div style={{ background: '#F5F0E8', borderRadius: '7px', padding: '5px 9px', textAlign: 'center', minWidth: '44px' }}>
                        <div style={{ fontSize: '8px', color: '#9A8A78', letterSpacing: '0.5px' }}>달성률</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#4A3728' }}>{pct}%</div>
                      </div>
                    )}
                    {exportData.showDday && exportData.selectedDday && (
                      <div style={{ background: '#4A3728', borderRadius: '7px', padding: '5px 9px', textAlign: 'center', minWidth: '44px' }}>
                        <div style={{ fontSize: '8px', color: '#C9A882', letterSpacing: '0.5px' }}>D-DAY</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>{getDdayText(exportData.selectedDday)}</div>
                        <div style={{ fontSize: '7px', color: '#C9A882' }}>{exportData.selectedDday.title}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 본문 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {exportData.design === 2 ? (
                    /* 디자인2: TASKS + TIMETABLE 2열 - 공로그 포함 */
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                      {/* 왼쪽: TASKS + 피드백 + 공로그 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '10px 14px', flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#9A8A78', marginBottom: '6px', letterSpacing: '2px' }}>TASKS</div>
                          {Object.entries(grouped).sort(([,a],[,b]) => (a.isEtc ? 1 : 0) - (b.isEtc ? 1 : 0)).map(([name, { goals: gList, color }]) => (
                            <div key={name} style={{ marginBottom: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px', background: color + '12', borderLeft: `2.5px solid ${color}`, marginBottom: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#4A3728' }}>{name}</span>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '600', color }}>{gList.filter(g=>g.done).length}/{gList.length}</span>
                              </div>
                              {gList.map(g => (
                                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 0', fontSize: '12px' }}>
                                  <span style={{ width: '15px', height: '15px', borderRadius: '3px', background: g.done ? color : '#fff', border: g.done ? 'none' : `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', flexShrink: 0 }}>{g.done && '✓'}</span>
                                  <span style={{ color: g.done ? '#C4B8A8' : '#4A3728', textDecoration: g.done ? 'line-through' : 'none' }}>{renderBlurText(g.cardText || g.text)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        {exportData.showFeedback && feedback && (
                          <div style={{ padding: '6px 14px 4px', flexShrink: 0 }}>
                            <div style={{ fontSize: '10px', color: '#C9A882', fontWeight: '600', letterSpacing: '1px', marginBottom: '2px' }}>오늘의 피드백</div>
                            <div style={{ fontSize: '12px', color: '#4A3728', lineHeight: '1.4', fontStyle: 'italic' }}>"{feedback}"</div>
                          </div>
                        )}
                        <div style={{ padding: '2px 14px 6px', textAlign: 'right', marginTop: 'auto', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#C9A882', letterSpacing: '1px' }}>공로그</span>
                        </div>
                      </div>
                      {/* 세로 구분선 */}
                      <div style={{ width: '1px', background: '#E8E0D4' }} />
                      {/* 오른쪽: TIMETABLE */}
                      <div style={{ width: '108px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '10px 10px 0' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#9A8A78', marginBottom: '5px', letterSpacing: '1px', textAlign: 'right' }}>TIME TABLE</div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {Array.from({ length: 19 }, (_, i) => (i + 7) % 24).map(h => {
                          const slots = sessionSlots[h] || {}
                          const filledCount = Object.keys(slots).length
                          const mainSlot = Object.values(slots)[0]
                          const fillPct = Math.round((filledCount / 12) * 100)
                          return (
                            <div key={h} style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1 }}>
                              <span style={{ width: '14px', color: '#C4B8A8', textAlign: 'right', fontSize: '9px', flexShrink: 0 }}>{String(h).padStart(2, '0')}</span>
                              <div style={{ flex: 1, height: '100%', borderRadius: '2px', background: '#F0EAE0', overflow: 'hidden', position: 'relative' }}>
                                {fillPct > 0 && mainSlot && (
                                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fillPct}%`, background: mainSlot.color, borderRadius: '2px', display: 'flex', alignItems: 'center', paddingLeft: '3px' }}>
                                    {fillPct > 30 && <span style={{ fontSize: '7px', color: '#fff', fontWeight: '500' }}>{mainSlot.subject}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 디자인1: 과목별 체크리스트 */
                    <div style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        {Object.entries(grouped).sort(([,a],[,b]) => (a.isEtc ? 1 : 0) - (b.isEtc ? 1 : 0)).map(([name, { goals: gList, color }]) => (
                          <div key={name} style={{ marginBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px', background: color + '12', borderLeft: `2.5px solid ${color}`, marginBottom: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#4A3728' }}>{name}</span>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '600', color }}>{gList.filter(g=>g.done).length}/{gList.length}</span>
                            </div>
                            {gList.map(g => (
                              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 0', fontSize: '12px' }}>
                                <span style={{ width: '15px', height: '15px', borderRadius: '3px', background: g.done ? color : '#fff', border: g.done ? 'none' : `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', flexShrink: 0 }}>{g.done && '✓'}</span>
                                <span style={{ color: g.done ? '#C4B8A8' : '#4A3728', textDecoration: g.done ? 'line-through' : 'none', flex: 1 }}>{renderBlurText(g.cardText || g.text)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      {exportData.showFeedback && feedback && (
                        <div style={{ borderTop: '1px solid #E8E0D4', paddingTop: '8px', marginTop: '4px', flexShrink: 0 }}>
                          <div style={{ fontSize: '10px', color: '#C9A882', fontWeight: '600', letterSpacing: '1px', marginBottom: '3px' }}>오늘의 피드백</div>
                          <div style={{ fontSize: '12px', color: '#4A3728', lineHeight: '1.5', fontStyle: 'italic' }}>"{feedback}"</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 하단 - 디자인1만 */}
                {exportData.design !== 2 && (
                  <div style={{ padding: '4px 16px 8px', textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#C9A882', letterSpacing: '1px' }}>공로그</span>
                  </div>
                )}
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={downloadCard} style={{ flex: 1, background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '12px', fontSize: '14px', cursor: 'pointer' }}>이미지 저장</button>
              <button onClick={postToFeed} style={{ flex: 1, background: '#6B5B45', color: '#fff', border: 'none', borderRadius: '20px', padding: '12px', fontSize: '14px', cursor: 'pointer' }}>인증글 올리기</button>
            </div>
          </div>
        </div>
        )
      })()}
    </main>
  )
}
