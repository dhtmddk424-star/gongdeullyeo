'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getToday } from '../../lib/today'
import Nav from '../components/Nav'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ddays, setDdays] = useState([])
  const [newDday, setNewDday] = useState({ title: '', target_date: '' })
  const [showDdayForm, setShowDdayForm] = useState(false)
  const [streak, setStreak] = useState(0)
  const [todayChecked, setTodayChecked] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerSubject, setTimerSubject] = useState('')
  const [sessions, setSessions] = useState([])
  const [weeklyStats, setWeeklyStats] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [subjects, setSubjects] = useState([])
  const [sessionDate, setSessionDate] = useState(getToday())
  const intervalRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user.id).order('sort_order')
      setSubjects(subs || [])
      await Promise.all([
        fetchDdays(user.id),
        fetchStreak(user.id),
        fetchSessions(user.id, getToday()),
        fetchWeeklyStats(user.id),
      ])
      setLoading(false)
    }
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); document.removeEventListener('visibilitychange', onVisible) }
  }, [router])

  const fetchDdays = async (uid) => {
    const { data } = await supabase.from('ddays').select('*').eq('user_id', uid).order('target_date')
    setDdays(data || [])
  }

  const addDday = async () => {
    if (!newDday.title || !newDday.target_date || !user) return
    await supabase.from('ddays').insert({ user_id: user.id, ...newDday })
    fetchDdays(user.id)
    setNewDday({ title: '', target_date: '' })
    setShowDdayForm(false)
  }

  const deleteDday = async (id) => {
    await supabase.from('ddays').delete().eq('id', id)
    setDdays(ddays.filter(d => d.id !== id))
  }

  const fetchStreak = async (uid) => {
    const today = getToday()
    const { data: todayData } = await supabase.from('streaks').select('id').eq('user_id', uid).eq('date', today)
    setTodayChecked(todayData && todayData.length > 0)

    const { data: allStreaks } = await supabase.from('streaks').select('date').eq('user_id', uid).order('date', { ascending: false }).limit(365)
    if (!allStreaks || allStreaks.length === 0) { setStreak(0); return }

    let count = 0
    const d = new Date()
    for (let i = 0; i < allStreaks.length; i++) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (allStreaks.find(s => s.date === dateStr)) {
        count++
        d.setDate(d.getDate() - 1)
      } else break
    }
    setStreak(count)
  }

  const checkIn = async () => {
    if (!user || todayChecked) return
    const today = getToday()
    await supabase.from('streaks').insert({ user_id: user.id, date: today })
    setTodayChecked(true)
    fetchStreak(user.id)
  }

  const fetchSessions = async (uid, date) => {
    const d = date || getToday()
    const { data } = await supabase.from('study_sessions').select('*').eq('user_id', uid).eq('date', d).order('created_at', { ascending: false })
    setSessions(data || [])
  }

  useEffect(() => {
    if (user) fetchSessions(user.id, sessionDate)
  }, [user, sessionDate])

  const deleteSession = async (id) => {
    await supabase.from('study_sessions').delete().eq('id', id)
    setSessions(sessions.filter(s => s.id !== id))
  }

  const changeSessionDate = (offset) => {
    const d = new Date(sessionDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    setSessionDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
  }

  useEffect(() => {
    if (user) fetchWeeklyStats(user.id, weekOffset)
  }, [user, weekOffset])

  const fetchWeeklyStats = async (uid, offset = 0) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset + offset * 7)
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    }
    const { data } = await supabase.from('study_sessions').select('date, duration_minutes').eq('user_id', uid).in('date', dates)
    const stats = dates.map(date => {
      const dayData = (data || []).filter(s => s.date === date)
      const total = dayData.reduce((sum, s) => sum + s.duration_minutes, 0)
      const d = new Date(date + 'T00:00:00')
      const dayName = d.toLocaleDateString('ko-KR', { weekday: 'short' })
      const dayNum = d.getDate()
      return { date, dayName, dayNum, total }
    })
    setWeeklyStats(stats)
  }

  const startTimer = () => {
    if (!timerSubject.trim()) return
    setTimerRunning(true)
    setTimerSeconds(0)
    intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
  }

  const stopTimer = async () => {
    clearInterval(intervalRef.current)
    setTimerRunning(false)
    const minutes = Math.max(1, Math.round(timerSeconds / 60))
    if (user) {
      await supabase.from('study_sessions').insert({ user_id: user.id, subject: timerSubject, duration_minutes: minutes, date: getToday() })
      fetchSessions(user.id, sessionDate)
      fetchWeeklyStats(user.id)
    }
    setTimerSeconds(0)
    setTimerSubject('')
  }

  const formatTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const getDday = (targetDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(targetDate + 'T00:00:00')
    const diff = Math.ceil((target - today) / 86400000)
    if (diff === 0) return 'D-DAY'
    if (diff > 0) return `D-${diff}`
    return `D+${Math.abs(diff)}`
  }

  const maxMinutes = Math.max(...weeklyStats.map(s => s.total), 60)

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '1.5rem' }}>대시보드</h1>

        {/* 스트릭 + 출석 */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>연속 출석</span>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#C9A882', marginTop: '4px' }}>{streak}일 🔥</div>
          </div>
          <button onClick={checkIn} disabled={todayChecked} style={{ background: todayChecked ? '#F0EAE0' : '#C9A882', color: todayChecked ? '#9A8A78' : '#fff', border: 'none', borderRadius: '20px', padding: '10px 20px', fontSize: '14px', cursor: todayChecked ? 'default' : 'pointer' }}>
            {todayChecked ? '출석 완료 ✓' : '오늘 출석하기'}
          </button>
        </div>

        {/* D-day */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>D-day</span>
            <span onClick={() => setShowDdayForm(!showDdayForm)} style={{ fontSize: '13px', color: '#C9A882', cursor: 'pointer' }}>+ 추가</span>
          </div>

          {showDdayForm && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input placeholder="시험 이름" value={newDday.title} onChange={(e) => setNewDday({ ...newDday, title: e.target.value })} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '13px', outline: 'none', color: '#4A3728' }} />
              <input type="date" value={newDday.target_date} onChange={(e) => setNewDday({ ...newDday, target_date: e.target.value })} style={{ padding: '8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '13px', outline: 'none', color: '#4A3728' }} />
              <button onClick={addDday} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>추가</button>
            </div>
          )}

          {ddays.length === 0 && <p style={{ fontSize: '13px', color: '#C4B8A8', textAlign: 'center', padding: '8px 0' }}>시험일을 추가해보세요!</p>}
          {ddays.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F0EAE0' }}>
              <span style={{ fontSize: '14px', color: '#4A3728' }}>{d.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#C9A882' }}>{getDday(d.target_date)}</span>
                <span onClick={() => deleteDday(d.id)} style={{ fontSize: '14px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
              </div>
            </div>
          ))}
        </div>

        {/* 타이머 */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', display: 'block', marginBottom: '12px' }}>공부 타이머</span>

          {!timerRunning ? (
            <div>
              {subjects.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {subjects.map(s => (
                    <span key={s.id} onClick={() => setTimerSubject(s.name)} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', background: timerSubject === s.name ? s.color : '#fff', color: timerSubject === s.name ? '#fff' : s.color, border: `1px solid ${s.color}` }}>{s.name}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input placeholder="과목명 직접 입력" value={timerSubject} onChange={(e) => setTimerSubject(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728' }} />
                <button onClick={startTimer} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>시작</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6B5B45', marginBottom: '8px' }}>{timerSubject}</div>
              <div style={{ fontSize: '48px', fontWeight: '600', color: '#C9A882', fontVariantNumeric: 'tabular-nums', marginBottom: '16px' }}>{formatTime(timerSeconds)}</div>
              <button onClick={stopTimer} style={{ background: '#E8D9C8', color: '#6B5B45', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}>종료 및 저장</button>
            </div>
          )}

          {/* 기록 날짜 이동 */}
          <div style={{ marginTop: '16px', borderTop: '0.5px solid #F0EAE0', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span onClick={() => changeSessionDate(-1)} style={{ fontSize: '14px', color: '#9A8A78', cursor: 'pointer', padding: '2px 6px' }}>◀</span>
              <span style={{ fontSize: '12px', color: '#9A8A78' }}>{sessionDate === getToday() ? '오늘 기록' : new Date(sessionDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 기록'}</span>
              <span onClick={() => sessionDate < getToday() && changeSessionDate(1)} style={{ fontSize: '14px', color: sessionDate < getToday() ? '#9A8A78' : '#E8E0D4', cursor: sessionDate < getToday() ? 'pointer' : 'default', padding: '2px 6px' }}>▶</span>
            </div>
            {sessions.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#C4B8A8', textAlign: 'center', padding: '8px 0' }}>기록이 없어요</p>
            ) : (
              <>
                {/* 과목별 시간 */}
                {(() => {
                  const bySubject = {}
                  sessions.forEach(s => { bySubject[s.subject] = (bySubject[s.subject] || 0) + s.duration_minutes })
                  return Object.entries(bySubject).map(([name, min]) => {
                    const sub = subjects.find(s => s.name === name)
                    return (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sub?.color || '#C9A882' }} />
                          <span style={{ color: '#4A3728' }}>{name}</span>
                        </div>
                        <span style={{ color: '#C9A882', fontWeight: '500' }}>{min}분</span>
                      </div>
                    )
                  })
                })()}
                {/* 개별 기록 */}
                <div style={{ marginTop: '8px', borderTop: '0.5px solid #F0EAE0', paddingTop: '8px' }}>
                  {sessions.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '12px' }}>
                      <span style={{ color: '#9A8A78' }}>{s.subject} — {s.duration_minutes}분</span>
                      <span onClick={() => deleteSession(s.id)} style={{ color: '#D4C8B8', cursor: 'pointer', fontSize: '14px' }}>×</span>
                    </div>
                  ))}
                </div>
                {/* 총 시간 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: '14px', fontWeight: '500', borderTop: '0.5px solid #F0EAE0', marginTop: '4px' }}>
                  <span style={{ color: '#6B5B45' }}>총 공부시간</span>
                  <span style={{ color: '#C9A882' }}>{(() => { const t = sessions.reduce((s, v) => s + v.duration_minutes, 0); return t >= 60 ? `${Math.floor(t/60)}시간 ${t%60}분` : `${t}분` })()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 프리미엄 기능 */}
        <div style={{ background: 'linear-gradient(135deg, #FAF0E4, #FFF8F0)', borderRadius: '12px', border: '1.5px solid #C9A882', padding: '1.25rem', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>프리미엄 기능</span>
            <span style={{ background: '#C9A882', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '8px' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => router.push('/ai-planner')} style={{ flex: 1, background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', cursor: 'pointer' }}>AI 학습 도우미</button>
            <button onClick={() => router.push('/report')} style={{ flex: 1, background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', cursor: 'pointer' }}>AI 학습 리포트</button>
          </div>
        </div>

        {/* 주간 공부 시간 차트 */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span onClick={() => setWeekOffset(weekOffset - 1)} style={{ fontSize: '16px', color: '#9A8A78', cursor: 'pointer', padding: '2px 8px' }}>◀</span>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>주간 공부 시간</span>
            <span onClick={() => weekOffset < 0 && setWeekOffset(weekOffset + 1)} style={{ fontSize: '16px', color: weekOffset < 0 ? '#9A8A78' : '#E8E0D4', cursor: weekOffset < 0 ? 'pointer' : 'default', padding: '2px 8px' }}>▶</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', gap: '8px' }}>
            {weeklyStats.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#9A8A78' }}>{s.total > 0 ? `${s.total}분` : ''}</span>
                <div style={{ width: '100%', maxWidth: '40px', background: s.total > 0 ? '#C9A882' : '#F0EAE0', borderRadius: '4px 4px 0 0', height: `${Math.max(4, (s.total / maxMinutes) * 100)}px`, transition: 'height 0.3s' }} />
                <span style={{ fontSize: '12px', color: '#6B5B45' }}>{s.dayName}</span>
                <span style={{ fontSize: '10px', color: '#C4B8A8' }}>{s.dayNum}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
