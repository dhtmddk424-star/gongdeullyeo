import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const formData = await req.formData()
    let text = formData.get('text') || ''
    const file = formData.get('file')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })
    const prompt = `다음은 학습 계획표 또는 커리큘럼입니다. 이 내용을 분석하여 날짜별 할일 목록을 JSON 형식으로 만들어주세요.

규칙:
1. 과목별로 분류해주세요
2. 각 할일은 구체적이고 실행 가능한 형태로
3. 날짜가 명시되지 않은 경우 오늘(${new Date().toISOString().split('T')[0]})부터 순차적으로 배분해주세요
4. 응답은 반드시 JSON만 출력해주세요

응답 형식:
{
  "subjects": ["과목1", "과목2"],
  "days": [
    {
      "date": "2024-01-01",
      "tasks": [
        {"subject": "과목1", "text": "할일 내용"},
        {"subject": "과목2", "text": "할일 내용"}
      ]
    }
  ]
}`

    let messages

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      if (file.name.endsWith('.pdf')) {
        messages = [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: prompt + (text ? `\n\n추가 설명:\n${text}` : '') }
          ]
        }]
      } else if (file.type?.startsWith('image/')) {
        const mediaType = file.type || 'image/png'
        messages = [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt + (text ? `\n\n추가 설명:\n${text}` : '') }
          ]
        }]
      } else {
        const fileText = Buffer.from(bytes).toString('utf-8')
        messages = [{ role: 'user', content: prompt + `\n\n학습 계획표 내용:\n${fileText}` }]
      }
    } else if (text.trim()) {
      messages = [{ role: 'user', content: prompt + `\n\n학습 계획표 내용:\n${text}` }]
    } else {
      return NextResponse.json({ error: '내용을 입력하거나 파일을 업로드해주세요.' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages
    })

    const content = message.content[0].text
    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      parsed = null
    }

    return NextResponse.json({ result: parsed, raw: content })
  } catch (error) {
    console.error('AI Parse Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
