'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function Community() {
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      fetchPosts()
    }
    getUser()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    setPosts(data || [])
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

    const { data } = await supabase.from('posts').insert({ user_id: user.id, content: newPost, image_url }).select()
    if (data) setPosts([data[0], ...posts])
    setNewPost('')
    setImage(null)
    setImagePreview(null)
    setUploading(false)
  }

  const deletePost = async (id) => {
    await supabase.from('posts').delete().eq('id', id)
    setPosts(posts.filter(p => p.id !== id))
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
      <nav style={{ background: '#FAF7F2', borderBottom: '0.5px solid #E8E0D4', padding: '0 2rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '17px', fontWeight: '500', color: '#6B5B45', cursor: 'pointer' }} onClick={() => window.location.href='/'}>공들여 📖</div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }} onClick={() => window.location.href='/planner'}>플래너</span>
          <span style={{ fontSize: '13px', color: '#C9A882', fontWeight: '500' }}>커뮤니티</span>
          <span style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }}>자료</span>
          {user && <button onClick={async () => { await supabase.auth.signOut(); window.location.href='/' }} style={{ background: 'transparent', color: '#9A8A78', border: '0.5px solid #D4C8B8', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>로그아웃</button>}
        </div>
      </nav>

      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '2rem' }}>인증 피드 🌱</h1>

        {user ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '16px' }}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="오늘의 공부를 인증해보세요! 예) 토익 RC 파트7 완료 ✍️"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#FAF7F2', resize: 'none', height: '80px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
            />
            {imagePreview && (
              <div style={{ position: 'relative', marginTop: '8px', display: 'inline-block' }}>
                <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
                <span onClick={() => { setImage(null); setImagePreview(null) }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}>×</span>
              </div>
            )}
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
            <button onClick={() => window.location.href='/login'} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}>로그인하기</button>
          </div>
        )}

        <div>
          {posts.length === 0 && (
            <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '2rem 0' }}>아직 인증글이 없어요. 첫 번째로 인증해보세요!</p>
          )}
          {posts.map(post => (
            <div key={post.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E8D9C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', color: '#6B5B45' }}>
                    {post.user_id?.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>공부중 👤</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#C4B8A8' }}>{timeAgo(post.created_at)}</span>
                  {user?.id === post.user_id && (
                    <span onClick={() => deletePost(post.id)} style={{ fontSize: '16px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#4A3728', lineHeight: '1.6', margin: 0 }}>{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="인증 사진" style={{ marginTop: '10px', maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}