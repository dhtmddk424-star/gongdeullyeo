import { supabase } from './supabase'

const cache = {}

export async function getNicknames(userIds) {
  const missing = userIds.filter(id => !cache[id])
  if (missing.length > 0) {
    const { data } = await supabase.from('profiles').select('id, nickname').in('id', missing)
    if (data) data.forEach(p => { cache[p.id] = p.nickname || p.id.slice(0, 4) })
  }
  const result = {}
  userIds.forEach(id => { result[id] = cache[id] || id.slice(0, 4) })
  return result
}
