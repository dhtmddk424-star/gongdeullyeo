'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getNicknames } from '../../lib/getNickname'
import Nav from '../components/Nav'

export default function Community() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [nicknames, setNicknames] = useState({})
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [filterTag, setFilterTag] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(data?.role === 'admin')
      }
      fetchPosts()
    }
    getUser()
  }, [])

  useEffect(() => { fetchPosts() }, [filterTag])

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const fetchPosts = async () => {
    let query = supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (filterTag) query = query.contains('tags', [filterTag])
    const { data } = await query
    const postList = data || []
    setPosts(postList)
    if (postList.length > 0) {
      const ids = [...new Set(postList.map(p => p.user_id))]
      const nicks = await getNicknames(ids)
      setNicknames(nicks)
    }
    setLoading(false)
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const addPost = async () => {
    if (!newPost.trim() || !user) return
    setUploading(true)
    let image_url = null
    if (image) {
      const ext = image.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('posts').upload(fileName, image)
      if (!error) {
        const { data } = supabase.storage.from('posts').getPublicUrl(fileName)
        image_url = data.publicUrl
      }
    }
    const { data } = await supabase.from('posts').insert({ user_id: user.id, content: newPost, image_url, tags }).select()
    if (data) {
      setPosts([data[0], ...posts])
      const nicks = await getNicknames([user.id])
      setNicknames(prev => ({ ...prev, ...nicks }))
    }
    setNewPost(''); setImage(null); setImagePreview(null); setTags([]); setUploading(false)
  }

  const deletePost = async (id) => {
    await supabase.from('posts').delete().eq('id', id)
    setPosts(posts.filter(p => p.id !== id))
  }

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728' }}>인증 피드 🌱</h1>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => router.push('/groups')}>스터디 그룹</span>
        </div>

        {/* #16 해시태그 필터 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {['', '수능', '토익', '공무원', '자격증', '대학원', '편입', '기타'].map(tag => (
            <span key={tag} onClick={() => setFilterTag(tag)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '14px', cursor: 'pointer', background: filterTag === tag ? '#C9A882' : '#fff', color: filterTag === tag ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>
              {tag ? `#${tag}` : '전체'}
            </span>
          ))}
        </div>

        {user ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="오늘의 공부를 인증해보세요! 예) 토익 RC 파트7 완료 ✍️" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#FAF7F2', resize: 'none', height: '80px', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
            {imagePreview && (
              <div style={{ position: 'relative', marginTop: '8px', display: 'inline-block' }}>
                <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
                <span onClick={() => { setImage(null); setImagePreview(null) }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}>×</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {tags.map(t => (
                <span key={t} style={{ background: '#FAF7F2', color: '#6B5B45', fontSize: '12px', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  #{t} <span onClick={() => setTags(tags.filter(x => x !== t))} style={{ cursor: 'pointer', color: '#C4B8A8' }}>×</span>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addTag() } }} placeholder="#태그 추가" style={{ border: 'none', outline: 'none', fontSize: '12px', color: '#9A8A78', background: 'transparent', width: '80px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <button onClick={() => fileRef.current.click()} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>📷 사진 추가</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              <button onClick={addPost} disabled={uploading} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}>
                {uploading ? '올리는 중...' : '인증하기'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '12px' }}>로그인하면 인증글을 작성할 수 있어요!</p>
            <button onClick={() => router.push('/login')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}>로그인하기</button>
          </div>
        )}

        <div>
          {posts.length === 0 && <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '2rem 0' }}>아직 인증글이 없어요. 첫 번째로 인증해보세요!</p>}
          {posts.map(post => (
            <div key={post.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E8D9C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', color: '#6B5B45' }}>
                    {(nicknames[post.user_id] || '??').slice(0, 1)}
                  </div>
                  <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>{nicknames[post.user_id] || '공부중'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#C4B8A8' }}>{timeAgo(post.created_at)}</span>
                  {/* #15: 본인 또는 관리자가 삭제 가능 */}
                  {(user?.id === post.user_id || isAdmin) && (
                    <span onClick={() => deletePost(post.id)} style={{ fontSize: '16px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#4A3728', lineHeight: '1.6', margin: 0 }}>{post.content}</p>
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {post.tags.map(t => (
                    <span key={t} onClick={() => setFilterTag(t)} style={{ fontSize: '12px', color: '#C9A882', cursor: 'pointer' }}>#{t}</span>
                  ))}
                </div>
              )}
              {post.image_url && <img src={post.image_url} alt="인증 사진" style={{ marginTop: '10px', maxWidth: '100%', borderRadius: '8px', display: 'block' }} />}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
