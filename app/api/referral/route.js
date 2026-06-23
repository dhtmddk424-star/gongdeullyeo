import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(req) {
  try {
    const { inviteeId, referralCode } = await req.json()
    if (!inviteeId || !referralCode) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

    const { data: inviter } = await supabase.from('profiles').select('id, credits').eq('referral_code', referralCode.toUpperCase()).single()
    if (!inviter) return NextResponse.json({ error: '존재하지 않는 초대코드입니다.' }, { status: 404 })
    if (inviter.id === inviteeId) return NextResponse.json({ error: '본인의 초대코드는 사용할 수 없어요.' }, { status: 400 })

    const { data: existing } = await supabase.from('referrals').select('id').eq('invitee_id', inviteeId).single()
    if (existing) return NextResponse.json({ error: '이미 초대코드를 사용했어요.' }, { status: 400 })

    await supabase.from('referrals').insert({ inviter_id: inviter.id, invitee_id: inviteeId, credited: true })

    await supabase.from('profiles').update({ credits: (inviter.credits || 0) + 1000 }).eq('id', inviter.id)
    await supabase.from('credit_history').insert({ user_id: inviter.id, amount: 1000, type: 'referral', description: '친구 초대 보상' })

    const { data: inviteeProfile } = await supabase.from('profiles').select('credits').eq('id', inviteeId).single()
    await supabase.from('profiles').update({ credits: (inviteeProfile?.credits || 0) + 1000 }).eq('id', inviteeId)
    await supabase.from('credit_history').insert({ user_id: inviteeId, amount: 1000, type: 'referral', description: '초대코드 입력 보상' })

    return NextResponse.json({ success: true, message: '1,000 크레딧이 적립되었어요!' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
