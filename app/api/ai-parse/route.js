import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const formData = await req.formData()
    let text = formData.get('text') || ''
    const file = formData.get('file')

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 400 })
    }

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      if (file.name.endsWith('.pdf')) {
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
        const pdfData = await pdfParse(buffer)
        text = pdfData.text
      } else {
        text = buffer.toString('utf-8')
      }
    }

    if (!text.trim()) {
      return NextResponse.json({ error: '내용이 비어있습니다.' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `다음은 학습 계획표 또는 커리큘럼입니다. 이 내용을 분석하여 날짜별 할일 목록을 JSON 형식으로 만들어주세요.

규칙:
1. 과목별로 분류해주세요
2. 각 할일은 구체적이고 실행 가능한 형태로
3. 날짜가 명시되지 않은 경우 오늘부터 순차적으로 배분해주세요
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
}

학습 계획표 내용:
${text}`
      }]
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
