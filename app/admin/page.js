'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Admin() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('inquiries')
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/'); return }
      setUser(user)
      await fetchInquiries()
      await fetchUsers()
      await fetchPayments()
      setLoading(false)
    }
    load()
  }, [router])

  const fetchInquiries = async () => {
    const { data } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false })
    setInquiries(data || [])
  }

  const fetchUsers = async () => {
    const { data } = await supabase.rpc('get_users_admin')
    setUsers(data || [])
  }

  const fetchPayments = async () => {
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
    setPayments(data || [])
  }

  const deleteInquiry = async (id) => {
    await supabase.from('inquiries').delete().eq('id', id)
    setInquiries(inquiries.filter(i => i.id !== id))
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return <main style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9A8A78' }}>불러오는 중...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'sans-serif' }}>
      <Nav />
      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#4A3728', marginBottom: '1.5rem' }}>관리자 페이지</h1>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          {['inquiries', 'users', 'payments'].map(t => (
            <span key={t} onClick={() => setTab(t)} style={{ fontSize: '13px', padding: '6px 16px', borderRadius: '14px', cursor: 'pointer', background: tab === t ? '#C9A882' : '#fff', color: tab === t ? '#fff' : '#9A8A78', border: '0.5px solid #E8E0D4' }}>
              {t === 'inquiries' ? `문의 (${inquiries.length})` : t === 'users' ? `회원 (${users.length})` : `결제 (${payments.length})`}
            </span>
          ))}
        </div>

        {tab === 'inquiries' && (
          <div>
            {inquiries.length === 0 && <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '2rem 0' }}>문의가 없어요</p>}
            {inquiries.map(inq => (
              <div key={inq.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', padding: '1.25rem', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: inq.category === '버그' ? '#FFE8E8' : inq.category === '아이디어' ? '#E8F0FF' : '#F0EAE0', color: inq.category === '버그' ? '#C44' : inq.category === '아이디어' ? '#448' : '#6B5B45', fontSize: '11px', padding: '2px 8px', borderRadius: '8px' }}>{inq.category}</span>
                    <span style={{ fontSize: '12px', color: '#C4B8A8' }}>{formatDate(inq.created_at)}</span>
                  </div>
                  <span onClick={() => deleteInquiry(inq.id)} style={{ fontSize: '14px', color: '#D4C8B8', cursor: 'pointer' }}>×</span>
                </div>
                <p style={{ fontSize: '14px', color: '#4A3728', lineHeight: '1.6', margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{inq.content}</p>
                {inq.wants_reply && (
                  <div style={{ fontSize: '12px', color: '#C9A882', background: '#FAF7F2', borderRadius: '6px', padding: '6px 10px' }}>
                    답변 요청: {inq.reply_email}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', overflow: 'hidden' }}>
            {users.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < users.length - 1 ? '0.5px solid #F0EAE0' : 'none' }}>
                <div>
                  <span style={{ fontSize: '14px', color: '#4A3728' }}>{u.email}</span>
                  {u.nickname && <span style={{ fontSize: '12px', color: '#9A8A78', marginLeft: '8px' }}>({u.nickname})</span>}
                  {u.role === 'admin' && <span style={{ fontSize: '10px', color: '#C9A882', marginLeft: '6px', border: '0.5px solid #C9A882', borderRadius: '6px', padding: '1px 5px' }}>관리자</span>}
                </div>
                <span style={{ fontSize: '11px', color: '#C4B8A8' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            {/* 월별 요약 */}
            {(() => {
              const monthly = {}
              payments.forEach(p => {
                const m = new Date(p.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
                if (!monthly[m]) monthly[m] = { total: 0, count: 0 }
                monthly[m].total += p.amount
                monthly[m].count++
              })
              return Object.entries(monthly).length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {Object.entries(monthly).map(([m, d]) => (
                    <div key={m} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #E8E0D4', padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#9A8A78' }}>{m}</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#4A3728' }}>{d.total.toLocaleString()}원</div>
                      <div style={{ fontSize: '11px', color: '#C4B8A8' }}>{d.count}건</div>
                    </div>
                  ))}
                </div>
              ) : null
            })()}

            {payments.length === 0 && <p style={{ fontSize: '14px', color: '#C4B8A8', textAlign: 'center', padding: '2rem 0' }}>결제 내역이 없어요</p>}

            {payments.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #E8E0D4', overflow: 'hidden' }}>
                {payments.map((p, i) => {
                  const u = users.find(u => u.id === p.user_id)
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < payments.length - 1 ? '0.5px solid #F0EAE0' : 'none' }}>
                      <div>
                        <span style={{ fontSize: '14px', color: '#4A3728' }}>{u?.email || p.user_id.slice(0,8)}</span>
                        <span style={{ fontSize: '11px', color: '#9A8A78', marginLeft: '8px' }}>{p.plan}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#C9A882' }}>{p.amount.toLocaleString()}원</div>
                        <div style={{ fontSize: '10px', color: '#C4B8A8' }}>{formatDate(p.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
