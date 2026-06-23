'use client'
import { useRouter, usePathname } from 'next/navigation'

export default function FloatingNav() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === '/' || pathname === '/login') return null

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 150 }}>
      <div
        onClick={() => window.location.reload()}
        style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #E8E0D4', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: '#9A8A78' }}
      >↻</div>
      <div
        onClick={() => router.back()}
        style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#C9A882', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: '#fff' }}
      >←</div>
    </div>
  )
}
