'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function ExportCard() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [goals, setGoals] = useState([])
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (profile?.nickname) setNickname(profile.nickname)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const { data: goalsData } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('date', selectedDate).order('created_at')
      setGoals(goalsData || [])
      const { data: fb } = await supabase.from('daily_feedback').select('feedback').eq('user_id', user.id).eq('date', selectedDate).single()
      setFeedback(fb?.feedback || '')
      setLoading(false)
    }
    fetchData()
  }, [user, selectedDate])

  useEffect(() => {
    if (loading || !canvasRef.current) return
    drawCard()
  }, [loading, goals, feedback, selectedDate, nickname])

  const drawCard = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = 1080, h = 1080
    canvas.width = w
    canvas.height = h

    ctx.fillStyle = '#FAF7F2'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#C9A882'
    ctx.globalAlpha = 0.08
    ctx.fillRect(40, 40, w - 80, h - 80)
    ctx.globalAlpha = 1

    ctx.strokeStyle = '#E8E0D4'
    ctx.lineWidth = 2
    ctx.strokeRect(60, 60, w - 120, h - 120)

    ctx.fillStyle = '#4A3728'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('공로그 📖', w / 2, 140)

    const dateObj = new Date(selectedDate + 'T00:00:00')
    const dateStr = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    ctx.fillStyle = '#9A8A78'
    ctx.font = '28px sans-serif'
    ctx.fillText(dateStr, w / 2, 190)

    if (nickname) {
      ctx.fillStyle = '#6B5B45'
      ctx.font = '26px sans-serif'
      ctx.fillText(`${nickname}님의 하루`, w / 2, 235)
    }

    const doneCount = goals.filter(g => g.done).length
    const total = goals.length
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

    ctx.fillStyle = '#F0EAE0'
    const barX = 120, barY = 270, barW = w - 240, barH = 24
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW, barH, 12)
    ctx.fill()

    if (pct > 0) {
      ctx.fillStyle = '#C9A882'
      ctx.beginPath()
      ctx.roundRect(barX, barY, barW * (pct / 100), barH, 12)
      ctx.fill()
    }

    ctx.fillStyle = '#6B5B45'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${doneCount}/${total} (${pct}%)`, w - 120, 265)

    ctx.textAlign = 'left'
    let y = 340
    const maxGoals = Math.min(goals.length, 12)

    for (let i = 0; i < maxGoals; i++) {
      const goal = goals[i]
      const checkX = 120, checkY = y - 14

      if (goal.done) {
        ctx.fillStyle = '#C9A882'
        ctx.beginPath()
        ctx.roundRect(checkX, checkY, 28, 28, 6)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText('✓', checkX + 6, y + 6)
      } else {
        ctx.strokeStyle = '#D4C8B8'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(checkX, checkY, 28, 28, 6)
        ctx.stroke()
      }

      ctx.fillStyle = goal.done ? '#C4B8A8' : '#4A3728'
      ctx.font = `${goal.done ? 'normal' : 'normal'} 26px sans-serif`
      const text = goal.text.length > 28 ? goal.text.slice(0, 28) + '...' : goal.text
      ctx.fillText(text, checkX + 44, y + 6)
      y += 48
    }

    if (goals.length > 12) {
      ctx.fillStyle = '#9A8A78'
      ctx.font = '22px sans-serif'
      ctx.fillText(`+${goals.length - 12}개 더`, 164, y + 6)
      y += 40
    }

    if (feedback) {
      y = Math.max(y + 20, 780)
      ctx.fillStyle = '#C9A882'
      ctx.globalAlpha = 0.1
      ctx.beginPath()
      ctx.roundRect(100, y - 20, w - 200, 100, 12)
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.fillStyle = '#6B5B45'
      ctx.font = 'italic 24px sans-serif'
      ctx.textAlign = 'center'
      const fbText = feedback.length > 50 ? feedback.slice(0, 50) + '...' : feedback
      ctx.fillText(`"${fbText}"`, w / 2, y + 30)
    }

    ctx.fillStyle = '#D4C8B8'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('gonglog.vercel.app', w / 2, h - 80)
  }

  const download = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `공로그_${selectedDate}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '8px' }}>인스타 카드 만들기</h1>
        <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '1.5rem' }}>오늘의 공부 기록을 이미지로 저장하세요</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', color: '#4A3728', outline: 'none' }} />
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '16px', marginBottom: '16px', overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: '8px' }} />
        </div>

        <button onClick={download} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px 32px', fontSize: '15px', cursor: 'pointer' }}>
          이미지 저장하기
        </button>
      </section>
    </main>
  )
}
