'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('이메일을 확인해주세요! 인증 링크를 보냈어요.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage('이메일 또는 비밀번호가 틀렸어요.')
      else router.push('/')
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #E8E0D4', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '8px', textAlign: 'center' }}>공들여 📖</h1>
        <p style={{ fontSize: '14px', color: '#9A8A78', textAlign: 'center', marginBottom: '2rem' }}>
          {isSignUp ? '계정을 만들어요' : '다시 만나서 반가워요'}
        </p>

        <div style={{ marginBottom: '12px' }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#4a3728' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #E8E0D4', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#4a3728' }}
          />
        </div>

        {message && (
          <p style={{ fontSize: '13px', color: '#C9A882', marginBottom: '16px', textAlign: 'center' }}>{message}</p>
        )}

        <button
          onClick={handleAuth}
          disabled={loading}
          style={{ width: '100%', background: '#C9A882', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px', fontSize: '15px', cursor: 'pointer', marginBottom: '16px' }}
        >
          {loading ? '잠깐만요...' : isSignUp ? '회원가입' : '로그인'}
        </button>

        <p style={{ fontSize: '13px', color: '#9A8A78', textAlign: 'center', cursor: 'pointer' }} onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? '로그인' : '회원가입'}
        </p>

        {!isSignUp && (
          <p
            style={{ fontSize: '12px', color: '#C4B8A8', textAlign: 'center', cursor: 'pointer', marginTop: '12px' }}
            onClick={async () => {
              if (!email) { setMessage('이메일을 먼저 입력해주세요.'); return }
              const { error } = await supabase.auth.resetPasswordForEmail(email)
              if (error) setMessage(error.message)
              else setMessage('비밀번호 재설정 링크를 이메일로 보냈어요!')
            }}
          >
            비밀번호를 잊으셨나요?
          </p>
        )}
      </div>
    </main>
  )
}
