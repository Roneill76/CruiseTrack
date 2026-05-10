import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType, isImage } = await req.json()

    const prompt = `You are a cruise reservation invoice parser. Extract the following fields from this invoice and respond ONLY with a valid JSON object, no markdown, no backticks, no extra text:
{
  "client": "passenger name(s) as listed on the booking",
  "line": "cruise line full name",
  "ship": "ship name",
  "sailDate": "YYYY-MM-DD format",
  "cabin": "cabin type or category",
  "conf": "booking or confirmation number",
  "pricePaid": 1000,
  "obc": 0,
  "balance": 0,
  "autoCharge": ""
}
Replace placeholder numbers with actual values. If not found use empty string or 0. Return ONLY the JSON object.`

    let messages: Anthropic.MessageParam[]

    if (isImage) {
      const imageMediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      messages = [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: base64 } },
        { type: 'text', text: prompt }
      ]}]
    } else {
      messages = [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: prompt }
      ]}]
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages
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
