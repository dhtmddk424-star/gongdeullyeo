'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Memo() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [memos, setMemos] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchMemos(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  const fetchMemos = async (uid) => {
    const { data } = await supabase.from('memos').select('*').eq('user_id', uid).order('updated_at', { ascending: false })
    setMemos(data || [])
    if (data && data.length > 0 && !selectedId) {
      setSelectedId(data[0].id)
      setTitle(data[0].title || '')
      setContent(data[0].content || '')
    }
  }

  const selectMemo = (memo) => {
    setSelectedId(memo.id)
    setTitle(memo.title || '')
    setContent(memo.content || '')
    setSaved(false)
  }

  const createNew = async () => {
    if (!user) return
    const { data } = await supabase.from('memos').insert({ user_id: user.id, title: '새 메모', content: '' }).select()
    if (data) {
      setMemos([data[0], ...memos])
      selectMemo(data[0])
    }
  }

  const save = async () => {
    if (!user || !selectedId) return
    setSaving(true)
    await supabase.from('memos').update({ title, content, updated_at: new Date().toISOString() }).eq('id', selectedId)
    setMemos(memos.map(m => m.id === selectedId ? { ...m, title, content, updated_at: new Date().toISOString() } : m))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const deleteMemo = async (id) => {
    await supabase.from('memos').delete().eq('id', id)
    const remaining = memos.filter(m => m.id !== id)
    setMemos(remaining)
    if (selectedId === id) {
      if (remaining.length > 0) selectMemo(remaining[0])
      else { setSelectedId(null); setTitle(''); setContent('') }
    }
  }

  useEffect(() => {
    if (!user || loading || !selectedId) return
    const timer = setTimeout(() => { save() }, 2000)
    return () => clearTimeout(timer)
  }, [title, content])

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>MEMO</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {saved && <span style={{ fontSize: '12px', color: '#C9A882' }}>저장됨 ✓</span>}
            <button onClick={save} disabled={saving} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '16px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={createNew} style={{ background: '#4A3728', color: '#fff', border: 'none', borderRadius: '16px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>+ 새 메모</button>
          </div>
        </div>

        {/* 메모 목록 */}
        {memos.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflow: 'auto', paddingBottom: '4px' }}>
            {memos.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <span onClick={() => selectMemo(m)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '14px', cursor: 'pointer', background: selectedId === m.id ? '#4A3728' : '#fff', color: selectedId === m.id ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4', whiteSpace: 'nowrap' }}>
                  {m.title || '제목 없음'}
                </span>
                {memos.length > 1 && (
                  <span onClick={() => deleteMemo(m.id)} style={{ fontSize: '12px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedId ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', overflow: 'hidden', position: 'relative' }}>
            {/* 제목 */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              style={{ width: '100%', padding: '16px 20px 8px', border: 'none', outline: 'none', fontSize: '18px', fontWeight: '600', color: '#4A3728', background: 'transparent', boxSizing: 'border-box' }}
            />
            <div style={{ height: '1px', background: '#E8E0D4', margin: '0 20px' }} />

            {/* 모눈 격자 배경 + 내용 */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'linear-gradient(#E8E0D4 1px, transparent 1px), linear-gradient(90deg, #E8E0D4 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                opacity: 0.3,
                pointerEvents: 'none',
              }} />
              <textarea
                id="memo-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  const ta = e.target
                  const start = ta.selectionStart
                  const end = ta.selectionEnd
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    const indent = '\t'
                    const newContent = content.substring(0, start) + indent + content.substring(end)
                    setContent(newContent)
                    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1 }, 0)
                  }
                  if (e.key === 'Backspace' && start === end && start > 0 && content[start - 1] === '\t') {
                    e.preventDefault()
                    const newContent = content.substring(0, start - 1) + content.substring(end)
                    setContent(newContent)
                    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start - 1 }, 0)
                  }
                }}
                placeholder="자유롭게 메모하세요..."
                style={{
                  width: '100%', minHeight: '400px', padding: '16px 20px', border: 'none', outline: 'none',
                  fontSize: '14px', lineHeight: '20px', color: '#4A3728', background: 'transparent',
                  resize: 'vertical', boxSizing: 'border-box', fontFamily: 'sans-serif', position: 'relative', zIndex: 1,
                  tabSize: 4, MozTabSize: 4,
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '16px' }}>메모가 없어요</p>
            <button onClick={createNew} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}>첫 메모 만들기</button>
          </div>
        )}

        <p style={{ fontSize: '11px', color: '#C4B8A8', marginTop: '8px', textAlign: 'center' }}>2초 후 자동 저장</p>
      </section>
    </main>
  )
}
