'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Contact() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [category, setCategory] = useState('버그')
  const [content, setContent] = useState('')
  const [wantsReply, setWantsReply] = useState(false)
  const [replyEmail, setReplyEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) setReplyEmail(user.email || '')
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!content.trim()) return
    if (wantsReply && !replyEmail.trim()) return
    setSending(true)
    await supabase.from('inquiries').insert({
      user_id: user?.id || null,
      category,
      content,
      wants_reply: wantsReply,
      reply_email: wantsReply ? replyEmail : null,
    })
    setSent(true)
    setSending(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <section style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '8px' }}>문의하기</h1>
        <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '2rem' }}>버그 제보나 아이디어를 보내주세요</p>

        {sent ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
            <h2 style={{ fontSize: '18px', color: '#4A3728', marginBottom: '8px' }}>전송되었어요!</h2>
            <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '20px' }}>소중한 의견 감사합니다</p>
            <button onClick={() => router.push('/')} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}>홈으로</button>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem' }}>
            <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>유형</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['버그', '아이디어', '기타'].map(c => (
                <span key={c} onClick={() => setCategory(c)} style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '14px', cursor: 'pointer', background: category === c ? '#C9A882' : '#FAF7F2', color: category === c ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>{c}</span>
              ))}
            </div>

            <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="어떤 내용이든 편하게 적어주세요"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', background: '#FAF7F2', resize: 'none', height: '120px', boxSizing: 'border-box', fontFamily: 'sans-serif', marginBottom: '16px' }}
            />

            <label style={{ fontSize: '13px', color: '#6B5B45', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '12px' }}>
              <input type="checkbox" checked={wantsReply} onChange={(e) => setWantsReply(e.target.checked)} />
              답변을 받고 싶어요
            </label>

            {wantsReply && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>답변 받을 이메일 *</label>
                <input
                  type="email"
                  value={replyEmail}
                  onChange={(e) => setReplyEmail(e.target.value)}
                  placeholder="example@email.com"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <button onClick={handleSubmit} disabled={sending || !content.trim() || (wantsReply && !replyEmail.trim())} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px', fontSize: '15px', cursor: 'pointer', opacity: (!content.trim() || (wantsReply && !replyEmail.trim())) ? 0.5 : 1 }}>
              {sending ? '전송 중...' : '보내기'}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
