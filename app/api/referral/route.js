import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(req) {
  try {
    const { inviteeId, referralCode } = await req.json()
    if (!inviteeId || !referralCode) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

    const { data: inviter } = await supabase.from('profiles').select('id').eq('referral_code', referralCode.toUpperCase()).single()
    if (!inviter) return NextResponse.json({ error: '존재하지 않는 초대코드입니다.' }, { status: 404 })
    if (inviter.id === inviteeId) return NextResponse.json({ error: '본인의 초대코드는 사용할 수 없어요.' }, { status: 400 })

    const { data: inviteeProfile } = await supabase.from('profiles').select('created_at').eq('id', inviteeId).single()
    if (inviteeProfile && (Date.now() - new Date(inviteeProfile.created_at).getTime()) > 3600000) {
      return NextResponse.json({ error: '가입 후 1시간 이내에만 초대코드를 입력할 수 있어요.' }, { status: 400 })
    }

    const { data: existing } = await supabase.from('referrals').select('id').eq('invitee_id', inviteeId).single()
    if (existing) return NextResponse.json({ error: '이미 초대코드를 사용했어요.' }, { status: 400 })

    const { error } = await supabase.rpc('apply_referral', { p_inviter_id: inviter.id, p_invitee_id: inviteeId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: '1,000 크레딧이 적립되었어요!' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
