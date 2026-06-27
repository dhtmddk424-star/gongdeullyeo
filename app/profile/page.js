'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [plan, setPlan] = useState('free')
  const [credits, setCredits] = useState(0)
  const [referralCode, setReferralCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [referralMsg, setReferralMsg] = useState('')
  const [referralCount, setReferralCount] = useState(0)
  const fileRef = useRef()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('nickname, avatar_url').eq('id', user.id).single()
      if (data?.nickname) setNickname(data.nickname)
      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      const { data: sub } = await supabase.from('subscriptions').select('plan, expires_at').eq('user_id', user.id).single()
      if (sub && sub.plan !== 'free' && (!sub.expires_at || new Date(sub.expires_at) > new Date())) setPlan(sub.plan)
      const { data: profile2 } = await supabase.from('profiles').select('credits, referral_code').eq('id', user.id).single()
      if (profile2) {
        setCredits(profile2.credits || 0)
        setReferralCode(profile2.referral_code || '')
      }
      const { data: refs } = await supabase.from('referrals').select('id').eq('inviter_id', user.id)
      setReferralCount(refs?.length || 0)
    }
    load()
  }, [router])

  const uploadAvatar = async (e) => {
    const file = e.target.files[0]
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `avatar-${user.id}.${ext}`
    const { error } = await supabase.storage.from('posts').upload(fileName, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('posts').getPublicUrl(fileName)
      const url = data.publicUrl + '?t=' + Date.now()
      setAvatarUrl(url)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    }
    setUploading(false)
  }

  const save = async () => {
    if (!nickname.trim() || !user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({ id: user.id, nickname: nickname.trim() })
    if (error) setMessage('저장 실패: ' + error.message)
    else setMessage('저장되었어요!')
    setSaving(false)
    setTimeout(() => setMessage(''), 2000)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <section style={{ maxWidth: '400px', margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '2rem', textAlign: 'center' }}>프로필 설정</h1>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: `url(${avatarUrl || '/default-avatar.png'}) center/cover`,
              cursor: 'pointer', border: '2px solid #E8E0D4',
              overflow: 'hidden', position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '10px', textAlign: 'center', padding: '2px 0' }}>변경</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
          {uploading && <p style={{ fontSize: '12px', color: '#C9A882', marginTop: '8px' }}>업로드 중...</p>}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.5rem' }}>
          <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            maxLength={20}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', boxSizing: 'border-box', marginBottom: '12px' }}
          />

          <label style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500', marginBottom: '8px', display: 'block' }}>이메일</label>
          <p style={{ fontSize: '14px', color: '#9A8A78', marginBottom: '16px' }}>{user?.email}</p>

          {message && <p style={{ fontSize: '13px', color: '#C9A882', marginBottom: '12px' }}>{message}</p>}

          <button onClick={save} disabled={saving} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px', fontSize: '15px', cursor: 'pointer' }}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>

        {/* 구독 상태 */}
        <div onClick={() => router.push('/subscribe')} style={{ marginTop: '16px', background: plan === 'premium' ? 'linear-gradient(135deg, #FAF0E4, #FFF8F0)' : '#fff', borderRadius: '12px', border: plan === 'premium' ? '1px solid #C9A882' : '0.5px solid #E8E0D4', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>{plan === 'premium' ? '프리미엄 구독 중' : '무료 플랜'}</div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '2px' }}>{plan === 'premium' ? 'AI 학습 도우미 · AI 리포트 이용 가능' : 'AI 기능을 사용하려면 구독하세요'}</div>
          </div>
          <span style={{ fontSize: '12px', color: '#C9A882', fontWeight: '500' }}>{plan === 'premium' ? '관리' : '업그레이드'} →</span>
        </div>

        {/* 크레딧 */}
        <div style={{ marginTop: '16px', background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6B5B45', fontWeight: '500' }}>내 크레딧</span>
            <span style={{ fontSize: '18px', fontWeight: '600', color: '#C9A882' }}>{credits.toLocaleString()}원</span>
          </div>

          <div style={{ background: '#FAF7F2', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6B5B45', marginBottom: '6px' }}>내 초대코드</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#4A3728', letterSpacing: '2px', flex: 1 }}>{referralCode}</span>
              <button onClick={() => { navigator.clipboard.writeText(referralCode); setReferralMsg('복사됨!'); setTimeout(() => setReferralMsg(''), 1500) }} style={{ background: '#C9A882', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}>복사</button>
            </div>
            <div style={{ fontSize: '11px', color: '#9A8A78', marginTop: '4px' }}>친구가 이 코드로 가입하면 서로 500원 적립! ({referralCount}명 초대됨)</div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6B5B45', marginBottom: '6px' }}>초대코드 입력</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} placeholder="초대코드 입력" maxLength={8} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', color: '#4A3728', letterSpacing: '1px', textTransform: 'uppercase' }} />
              <button onClick={async () => {
                if (!inputCode.trim()) return
                setReferralMsg('')
                const res = await fetch('/api/referral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteeId: user.id, referralCode: inputCode }) })
                const data = await res.json()
                if (data.success) { setReferralMsg(data.message); setCredits(credits + 500); setInputCode('') }
                else setReferralMsg(data.error)
              }} style={{ background: '#4A3728', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer' }}>적용</button>
            </div>
          </div>

          {referralMsg && <p style={{ fontSize: '12px', color: '#C9A882', marginTop: '4px' }}>{referralMsg}</p>}

          {credits >= 3900 && plan !== 'premium' && (
            <button onClick={() => alert('서비스 준비중입니다.')} style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>
              크레딧으로 프리미엄 1개월 구독 (3,900원)
            </button>
          )}
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <span onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem('auto-login'); router.push('/') }} style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }}>로그아웃</span>
          <span style={{ color: '#E8E0D4' }}>·</span>
          <span onClick={() => router.push('/contact')} style={{ fontSize: '13px', color: '#9A8A78', cursor: 'pointer' }}>문의하기</span>
        </div>
      </section>
    </main>
  )
}
