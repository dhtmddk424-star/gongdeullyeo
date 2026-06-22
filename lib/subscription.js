import { supabase } from './supabase'

export async function checkPremium(userId) {
  if (!userId) return false
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, expires_at')
    .eq('user_id', userId)
    .single()
  if (!data || data.plan === 'free') return false
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false
  return true
}
