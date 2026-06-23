'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getNicknames } from '../../lib/getNickname'
import Nav from '../components/Nav'

export default function Groups() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '수능', max_members: 10 })
  const [memberCounts, setMemberCounts] = useState({})
  const [myGroups, setMyGroups] = useState(new Set())
  const [nicknames, setNicknames] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      await fetchGroups(user?.id)
      setLoading(false)
    }
    load()
  }, [])

  const fetchGroups = async (uid) => {
    const { data } = await supabase.from('study_groups').select('*').order('created_at', { ascending: false })
    const groupList = data || []
    setGroups(groupList)

    if (groupList.length > 0) {
      const ids = [...new Set(groupList.map(g => g.creator_id))]
      const nicks = await getNicknames(ids)
      setNicknames(nicks)

      const { data: members } = await supabase.from('group_members').select('group_id, user_id')
      const counts = {}
      const mine = new Set()
      ;(members || []).forEach(m => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1
        if (uid && m.user_id === uid) mine.add(m.group_id)
      })
      setMemberCounts(counts)
      setMyGroups(mine)
    }
  }

  const createGroup = async () => {
    if (!form.title || !user) return
    await supabase.from('study_groups').insert({ creator_id: user.id, ...form })
    setShowForm(false)
    setForm({ title: '', description: '', category: '수능', max_members: 10 })
    fetchGroups(user.id)
  }

  const joinGroup = async (groupId) => {
    if (!user) { router.push('/login'); return }
    await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id })
    setMyGroups(new Set([...myGroups, groupId]))
    setMemberCounts({ ...memberCounts, [groupId]: (memberCounts[groupId] || 0) + 1 })
  }

  const leaveGroup = async (groupId) => {
    if (!user) return
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    const newSet = new Set(myGroups)
    newSet.delete(groupId)
    setMyGroups(newSet)
    setMemberCounts({ ...memberCounts, [groupId]: Math.max(0, (memberCounts[groupId] || 1) - 1) })
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>스터디 그룹 👥</h1>
          {user && <button onClick={() => setShowForm(!showForm)} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}>+ 그룹 만들기</button>}
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <input placeholder="그룹 이름" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', marginBottom: '8px', boxSizing: 'border-box' }} />
            <input placeholder="그룹 설명" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', marginBottom: '8px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', color: '#4A3728', outline: 'none' }}>
                <option>수능</option><option>토익</option><option>공무원</option><option>자격증</option><option>대학원</option><option>기타</option>
              </select>
              <input type="number" placeholder="최대 인원" value={form.max_members} onChange={(e) => setForm({ ...form, max_members: Number(e.target.value) })} style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', color: '#4A3728', outline: 'none' }} />
            </div>
            <button onClick={createGroup} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer', float: 'right' }}>만들기</button>
            <div style={{ clear: 'both' }} />
          </div>
        )}

        {groups.length === 0 && <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '2rem 0' }}>아직 스터디 그룹이 없어요. 첫 번째로 만들어보세요!</p>}

        {groups.map(g => (
          <div key={g.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '500', color: '#4A3728' }}>{g.title}</span>
                  <span style={{ background: '#FAF7F2', color: '#9A8A78', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>{g.category}</span>
                </div>
                {g.description && <p style={{ fontSize: '13px', color: '#9A8A78', margin: '0 0 4px' }}>{g.description}</p>}
                <span style={{ fontSize: '12px', color: '#C4B8A8' }}>by {nicknames[g.creator_id] || '알 수 없음'} · {memberCounts[g.id] || 0}/{g.max_members}명</span>
              </div>
              {user && (
                myGroups.has(g.id) ? (
                  <button onClick={() => leaveGroup(g.id)} style={{ background: '#F0EAE0', color: '#9A8A78', border: 'none', borderRadius: '16px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>나가기</button>
                ) : (memberCounts[g.id] || 0) < g.max_members ? (
                  <button onClick={() => joinGroup(g.id)} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '16px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>참여</button>
                ) : (
                  <span style={{ fontSize: '12px', color: '#C4B8A8' }}>마감</span>
                )
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
