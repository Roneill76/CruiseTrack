import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType, isImage } = await req.json()

    const prompt = `You are a cruise reservation invoice parser. Extract the following fields from this invoice and respond ONLY with a valid JSON object, no markdown, no backticks, no extra text:
{
  "client": "passenger name(s) as listed on the booking",
  "line": "cruise line full name (e.g. Norwegian Cruise Line, Royal Caribbean, Carnival, Virgin Voyages)",
  "ship": "ship name",
  "sailDate": "YYYY-MM-DD format",
  "cabin": "cabin type or category (e.g. Interior, Balcony, Solo Studio, Interior 4B)",
  "conf": "booking or confirmation number",
  "pricePaid": 0,
  "obc": 0,
  "balance": 0,
  "autoCharge": ""
}
If a field is not found, use empty string or 0. Return ONLY the JSON object.`

    const imageMediaType = (mimeType as string) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const contentBlock: Anthropic.MessageParam['content'] = isImage
      ? [
          { type: 'image' as const, source: { type: 'base64' as const, media_type: imageMediaType, data: base64 } },
          { type: 'text' as const, text: prompt }
        ]
      : [
          { type: 'text' as const, text: prompt }
        ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: contentBlock }]
    })

    const text = response.content.map(c => ('text' in c ? c.text : '')).join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Parse error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
