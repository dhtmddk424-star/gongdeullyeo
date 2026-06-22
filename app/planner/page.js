'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Planner() {
  const [goals, setGoals] = useState([])
  const [newGoal, setNewGoal] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      fetchGoals(user.id)
    }
    getUser()
  }, [])

  const fetchGoals = async (userId) => {
    const { data } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at')
    setGoals(data || [])
    setLoading(false)
  }

  const toggleGoal = async (goal) => {
    await supabase.from('goals').update({ done: !goal.done }).eq('id', goal.id)
    setGoals(goals.map(g => g.id === goal.id ? { ...g, done: !g.done } : g))
  }

  const addGoal = async () => {
    if (!newGoal.trim() || !user) return
    const { data } = await supabase.from('goals').insert({ user_id: user.id, text: newGoal, done: false }).select()
    if (data) setGoals([...goals, data[0]])
    setNewGoal('')
  }

  const deleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(goals.filter(g => g.id !== id))
  }

  const doneCount = goals.filter(g => g.done).length

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', padding: '0 2rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45', cursor: 'pointer' }} onClick={() => window.location.href='/'}>공들여 📖</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#C9A882', fontWeight: '500' }}>플래너</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }}>커뮤니티</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }}>자료</span>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href='/' }} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>로그아웃</button>
        </div>
      </nav>

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '4px' }}>오늘의 플래너</h1>
        <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '2rem' }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>

        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>오늘 진행도</span>
            <span style={{ fontSize: '13px', color: '#C9A882', fontWeight: '500' }}>{doneCount}/{goals.length}</span>
          </div>
          <div style={{ background: '#F0EAE0', borderRadius: '4px', height: '8px' }}>
            <div style={{ background: '#C9A882', borderRadius: '4px', height: '8px', width: goals.length ? `${(doneCount/goals.length)*100}%` : '0%', transition: 'width 0.3s' }} />
          </div>
        </div>

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

        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGoal()} placeholder="새 목표 추가..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#fff' }} />
          <button onClick={addGoal} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', cursor: 'pointer' }}>추가</button>
        </div>
      </section>
    </main>
  )
}