'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { checkPremium } from '../../lib/subscription'
import Nav from '../components/Nav'

export default function Report() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('weekly')
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)
  const [stats, setStats] = useState({ totalMinutes: 0, totalGoals: 0, doneGoals: 0, streakDays: 0, subjects: [] })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const premium = await checkPremium(user.id)
      setIsPremium(premium)
      if (!premium) { router.push('/subscribe'); return }
      await fetchStats(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  const fetchStats = async (uid) => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekStr = weekAgo.toISOString().split('T')[0]

    const [sessionsRes, goalsRes, streakRes] = await Promise.all([
      supabase.from('study_sessions').select('*').eq('user_id', uid).gte('date', weekStr),
      supabase.from('goals').select('*').eq('user_id', uid).gte('date', weekStr),
      supabase.from('streaks').select('date').eq('user_id', uid).order('date', { ascending: false }).limit(30),
    ])

    const sessions = sessionsRes.data || []
    const goals = goalsRes.data || []
    const streaks = streakRes.data || []

    const subjectMap = {}
    sessions.forEach(s => {
      subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.duration_minutes
    })
    const subjects = Object.entries(subjectMap).map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes)

    let streakCount = 0
    const d = new Date()
    for (const s of streaks) {
      if (s.date === d.toISOString().split('T')[0]) {
        streakCount++
        d.setDate(d.getDate() - 1)
      } else break
    }

    const dailyRates = {}
    goals.forEach(g => {
      if (!dailyRates[g.date]) dailyRates[g.date] = { total: 0, done: 0 }
      dailyRates[g.date].total++
      if (g.done) dailyRates[g.date].done++
    })
    const rates = Object.values(dailyRates).filter(d => d.total > 0 && d.done > 0).map(d => Math.round((d.done / d.total) * 100))
    const avgRate = rates.length > 0 ? Math.round(rates.reduce((s, v) => s + v, 0) / rates.length) : 0

    const dailyStudy = {}
    sessions.forEach(s => { dailyStudy[s.date] = (dailyStudy[s.date] || 0) + s.duration_minutes })
    const dailyData = Object.entries({ ...dailyRates, ...Object.fromEntries(Object.keys(dailyStudy).map(k => [k, dailyRates[k] || { total: 0, done: 0 }])) })
      .map(([date, r]) => ({ date, rate: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0, minutes: dailyStudy[date] || 0, total: r.total, done: r.done }))
      .sort((a, b) => a.date.localeCompare(b.date))
    const activeDays = dailyData.filter(d => d.minutes > 0 || d.done > 0).length
    const avgDailyMin = activeDays > 0 ? Math.round(sessions.reduce((s, v) => s + v.duration_minutes, 0) / activeDays) : 0
    const bestDay = dailyData.reduce((best, d) => d.minutes > (best?.minutes || 0) ? d : best, null)
    const totalMin = sessions.reduce((s, v) => s + v.duration_minutes, 0)

    setStats({
      totalMinutes: totalMin,
      totalGoals: goals.length,
      doneGoals: goals.filter(g => g.done).length,
      avgRate,
      streakDays: streakCount,
      subjects,
      dailyData,
      activeDays,
      avgDailyMin,
      bestDay,
    })
  }

  const generateReport = () => {
    setGenerating(true)
    // AI 리포트 생성 (추후 Anthropic API 연동)
    setTimeout(() => {
      const pct = stats.avgRate || 0
      const totalHours = (stats.totalMinutes / 60).toFixed(1)
      const topSubject = stats.subjects[0]?.name || '기록 없음'

      setReport({
        summary: `이번 주 총 ${totalHours}시간 공부했고, 목표 달성률은 ${pct}%입니다.`,
        highlights: [
          `가장 많이 공부한 과목: ${topSubject}`,
          `${stats.streakDays}일 연속 출석 중`,
          `총 ${stats.totalGoals}개 목표 중 ${stats.doneGoals}개 완료`,
        ],
        suggestion: pct >= 80
          ? '목표 달성률이 높아요! 난이도를 조금 올려보는 건 어떨까요?'
          : pct >= 50
          ? '꾸준히 하고 있어요. 하루 목표를 2~3개로 줄이고 달성률을 높여보세요.'
          : '목표를 작게 쪼개보세요. 작은 성취감이 습관을 만들어요.',
      })
      setGenerating(false)
    }, 2000)
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>AI 학습 리포트</h1>
          <span style={{ background: '#C9A882', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>프리미엄</span>
        </div>
        <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '1.5rem' }}>학습 데이터를 분석하고 방향을 제안해요</p>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          {['weekly', 'monthly'].map(t => (
            <span key={t} onClick={() => setTab(t)} style={{ fontSize: '13px', padding: '6px 16px', borderRadius: '14px', cursor: 'pointer', background: tab === t ? '#C9A882' : '#fff', color: tab === t ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>
              {t === 'weekly' ? '주간' : '월간'}
            </span>
          ))}
        </div>

        {/* 핵심 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '600', color: '#C9A882' }}>{stats.totalMinutes >= 60 ? `${Math.floor(stats.totalMinutes/60)}H` : `${stats.totalMinutes}M`}</div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '2px' }}>총 공부시간</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '600', color: '#C9A882' }}>{stats.avgRate || 0}%</div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '2px' }}>평균 달성률</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '600', color: '#C9A882' }}>{stats.streakDays}일</div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '2px' }}>연속 출석</div>
          </div>
        </div>

        {/* 추가 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#4A3728' }}>{stats.activeDays || 0}일</div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '2px' }}>공부한 날</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#4A3728' }}>{stats.avgDailyMin >= 60 ? `${Math.floor(stats.avgDailyMin/60)}H ${stats.avgDailyMin%60}M` : `${stats.avgDailyMin || 0}M`}</div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '2px' }}>일평균</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#4A3728' }}>{stats.subjects.length}과목</div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '2px' }}>학습 과목</div>
          </div>
        </div>

        {/* 일별 공부시간 차트 */}
        {stats.dailyData && stats.dailyData.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', display: 'block', marginBottom: '12px' }}>일별 공부 시간</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '80px', gap: '6px' }}>
              {stats.dailyData.map((d, i) => {
                const max = Math.max(...stats.dailyData.map(x => x.minutes), 1)
                const dayName = new Date(d.date + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'short' })
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '9px', color: '#9A8A78' }}>{d.minutes > 0 ? (d.minutes >= 60 ? `${Math.floor(d.minutes/60)}H` : `${d.minutes}M`) : ''}</span>
                    <div style={{ width: '100%', background: d.minutes > 0 ? '#C9A882' : '#F0EAE0', borderRadius: '3px 3px 0 0', height: `${Math.max(4, (d.minutes / max) * 60)}px` }} />
                    <span style={{ fontSize: '10px', color: '#6B5B45' }}>{dayName}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 일별 달성률 추이 */}
        {stats.dailyData && stats.dailyData.filter(d => d.total > 0).length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', display: 'block', marginBottom: '12px' }}>일별 목표 달성률</span>
            {stats.dailyData.filter(d => d.total > 0).map((d, i) => {
              const dayName = new Date(d.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#9A8A78', width: '80px', flexShrink: 0 }}>{dayName}</span>
                  <div style={{ flex: 1, background: '#F0EAE0', borderRadius: '3px', height: '8px' }}>
                    <div style={{ background: d.rate >= 80 ? '#8BA88E' : d.rate >= 50 ? '#C9A882' : '#C4869B', borderRadius: '3px', height: '8px', width: `${d.rate}%` }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#4A3728', fontWeight: '500', width: '35px', textAlign: 'right' }}>{d.rate}%</span>
                </div>
              )
            })}
          </div>
        )}

        {/* 과목별 시간 + 비율 */}
        {stats.subjects.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', display: 'block', marginBottom: '12px' }}>과목별 공부 시간</span>
            {stats.subjects.map((s, i) => {
              const pctOfTotal = stats.totalMinutes > 0 ? Math.round((s.minutes / stats.totalMinutes) * 100) : 0
              return (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#4A3728' }}>{s.name}</span>
                  <span style={{ color: '#C9A882' }}>{s.minutes >= 60 ? `${Math.floor(s.minutes/60)}H ${s.minutes%60}M` : `${s.minutes}M`} ({pctOfTotal}%)</span>
                </div>
                <div style={{ background: '#F0EAE0', borderRadius: '3px', height: '6px' }}>
                  <div style={{ background: '#C9A882', borderRadius: '3px', height: '6px', width: `${(s.minutes / stats.subjects[0].minutes) * 100}%` }} />
                </div>
              </div>
            )})}
          </div>
        )}

        {/* 최고 기록 */}
        {stats.bestDay && stats.bestDay.minutes > 0 && (
          <div style={{ background: '#FFF8EE', borderRadius: '12px', border: '1px solid #E8D9C8', padding: '1rem', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#C9A882', fontWeight: '600', marginBottom: '4px' }}>🏆 이번 주 최고 기록</div>
            <div style={{ fontSize: '14px', color: '#4A3728', fontWeight: '500' }}>
              {new Date(stats.bestDay.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} — {stats.bestDay.minutes >= 60 ? `${Math.floor(stats.bestDay.minutes/60)}H ${stats.bestDay.minutes%60}M` : `${stats.bestDay.minutes}M`}
            </div>
          </div>
        )}

        {/* AI 리포트 생성 */}
        {!report ? (
          <button onClick={generateReport} disabled={generating} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '14px', fontSize: '15px', cursor: 'pointer', fontWeight: '500' }}>
            {generating ? 'AI 분석 중...' : 'AI 리포트 생성하기'}
          </button>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '15px', color: '#4A3728', marginBottom: '12px' }}>AI 분석 결과</h3>
            <p style={{ fontSize: '14px', color: '#6B5B45', lineHeight: '1.7', marginBottom: '16px' }}>{report.summary}</p>

            <div style={{ marginBottom: '16px' }}>
              {report.highlights.map((h, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#9A8A78', padding: '4px 0' }}>• {h}</div>
              ))}
            </div>

            <div style={{ background: '#FAF0E4', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#C9A882', fontWeight: '500', display: 'block', marginBottom: '4px' }}>AI 제안</span>
              <p style={{ fontSize: '13px', color: '#6B5B45', margin: 0, lineHeight: '1.6' }}>{report.suggestion}</p>
            </div>

            <button onClick={() => setReport(null)} style={{ background: '#F0EAE0', color: '#9A8A78', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}>다시 생성</button>
          </div>
        )}
      </section>
    </main>
  )
}
