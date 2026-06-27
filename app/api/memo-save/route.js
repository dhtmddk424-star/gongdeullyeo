import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(req) {
  try {
    const { id, title, content } = await req.json()
    if (!id) return NextResponse.json({ error: 'no id' }, { status: 400 })
    await supabase.from('memos').update({ title, content, updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'fail' }, { status: 500 })
  }
}
