import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { goals, sessions, feedback, subjects, stats } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 })

    const client = new Anthropic({ apiKey })

    const prompt = `당신은 학습 코치입니다. 아래 학생의 1주일 학습 데이터를 분석해서 한국어로 피드백을 해주세요.

## 학습 데이터

### 통계
- 총 공부 시간: ${stats.totalMinutes}분
- 평균 달성률: ${stats.avgRate}%
- 연속 출석: ${stats.streakDays}일
- 공부한 날: ${stats.activeDays}일
- 학습 과목: ${subjects.map(s => `${s.name}(${s.minutes}분)`).join(', ')}

### 일별 할일 목록
${goals.map(g => `[${g.date}] ${g.done ? '✅' : '⬜'} ${g.subject_name || '기타'}: ${g.text}`).join('\n')}

### 일별 피드백
${feedback.map(f => `[${f.date}] "${f.feedback}"`).join('\n')}

### 공부 시간 기록
${sessions.map(s => `[${s.date}] ${s.subject} ${s.duration_minutes}분`).join('\n')}

## 분석 요청
다음 항목을 JSON으로 응답해주세요:

{
  "summary": "한두 문장으로 이번 주 학습 요약",
  "content_analysis": "학습 내용의 질과 균형에 대한 분석 (3-4문장)",
  "strengths": ["잘한 점 3가지"],
  "improvements": ["개선할 점 3가지"],
  "weekly_tip": "다음 주를 위한 구체적인 조언 (2-3문장)",
  "subject_balance": "과목별 공부 균형 분석 (2문장)",
  "study_pattern": "공부 패턴 분석 - 시간대, 집중도, 꾸준함 (2문장)"
}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].text
    let parsed
    try {
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    } catch {
      parsed = null
    }

    return NextResponse.json({ result: parsed, raw: text })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
