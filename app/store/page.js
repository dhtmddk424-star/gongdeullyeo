'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getNicknames } from '../../lib/getNickname'
import Nav from '../components/Nav'

export default function Store() {
  const router = useRouter()
  const [materials, setMaterials] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: 0, is_paid: false })
  const [file, setFile] = useState(null)
  const [nicknames, setNicknames] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(data?.role === 'admin')
      }
      fetchMaterials()
    }
    getUser()
  }, [])

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false })
    const list = data || []
    setMaterials(list)
    if (list.length > 0) {
      const ids = [...new Set(list.map(m => m.user_id))]
      const nicks = await getNicknames(ids)
      setNicknames(nicks)
    }
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!form.title || !file || !user) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('materials').upload(fileName, file)

    if (!error) {
      const { data: urlData } = supabase.storage.from('materials').getPublicUrl(fileName)
      await supabase.from('materials').insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        file_url: urlData.publicUrl,
        file_name: file.name,
        is_paid: form.is_paid,
        price: form.is_paid ? form.price : 0,
      })
      fetchMaterials()
      setShowForm(false)
      setForm({ title: '', description: '', price: 0, is_paid: false })
      setFile(null)
    }
    setUploading(false)
  }

  const deleteMaterial = async (id) => {
    await supabase.from('materials').delete().eq('id', id)
    setMaterials(materials.filter(m => m.id !== id))
  }

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff/60)}분 전`
    if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`
    return `${Math.floor(diff/86400)}일 전`
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />

      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '4px' }}>학습 자료 📚</h1>
            <p style={{ fontSize: '14px', color: '#9A8A78' }}>공부 자료를 공유하고 함께 성장해요</p>
          </div>
          {user && (
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}>
              + 자료 올리기
            </button>
          )}
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <input
              placeholder="자료 제목"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', marginBottom: '8px', boxSizing: 'border-box' }}
            />
            <input
              placeholder="간단한 설명"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', marginBottom: '8px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', color: '#6B5B45', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} />
                유료로 판매하기
              </label>
              {form.is_paid && (
                <input
                  type="number"
                  placeholder="가격 (원)"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  style={{ width: '120px', padding: '8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728' }}
                />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => fileRef.current.click()} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>
                {file ? `📎 ${file.name}` : '📎 파일 선택'}
              </button>
              <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
              <button onClick={handleUpload} disabled={uploading} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}>
                {uploading ? '올리는 중...' : '업로드'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {materials.length === 0 && (
            <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '3rem 0' }}>아직 자료가 없어요. 첫 번째로 올려보세요!</p>
          )}
          {materials.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#4A3728' }}>{item.title}</span>
                  {item.is_paid && (
                    <span style={{ background: '#FAEEDA', color: '#854F0B', fontSize: '10px', padding: '2px 8px', borderRadius: '10px' }}>유료</span>
                  )}
                </div>
                {item.description && <p style={{ fontSize: '12px', color: '#9A8A78', marginBottom: '4px' }}>{item.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#C4B8A8' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#E8D9C8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#6B5B45', fontWeight: '500' }}>
                    {(nicknames[item.user_id] || '??').slice(0, 1)}
                  </div>
                  <span>{timeAgo(item.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                {(user?.id === item.user_id || isAdmin) && (
                  <span onClick={() => deleteMaterial(item.id)} style={{ fontSize: '14px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
                )}
                {item.is_paid ? (
                  <>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#C9A882' }}>{item.price?.toLocaleString()}원</span>
                    <button onClick={() => alert('결제 기능 준비 중이에요!')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '16px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer' }}>구매하기</button>
                  </>
                ) : user ? (
                  <a href={item.file_url} target="_blank" rel="noreferrer" style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #E8E0D4', borderRadius: '16px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none' }}>다운로드</a>
                ) : (
                  <button onClick={() => router.push('/login')} style={{ background: 'transparent', color: '#C9A882', border: '0.5px solid #C9A882', borderRadius: '16px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer' }}>로그인 필요</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
