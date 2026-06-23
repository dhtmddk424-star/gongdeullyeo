'use client'
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthGuard({ children }) {
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const autoLogin = localStorage.getItem('auto-login')
      if (autoLogin !== 'true') {
        await supabase.auth.signOut()
      }
    }
    check()
  }, [])

  return children
}
