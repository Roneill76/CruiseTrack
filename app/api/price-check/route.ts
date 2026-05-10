import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { reservations } = await req.json()

    const resList = reservations.map((r: any) =>
      `ID: ${r.id} | Client: ${r.client} | Line: ${r.line} | Ship: ${r.ship} | Sail: ${r.sail_date} | Cabin: ${r.cabin} | Paid: $${r.price_paid}`
    ).join('\n')

    const prompt = `You are a cruise pricing analyst with deep knowledge of current market rates for major cruise lines (Norwegian, Royal Caribbean, Carnival, Virgin Voyages).

For each reservation below, estimate the CURRENT market price for the same cabin category on the same sailing. Prices change constantly — some may have dropped, some may be higher. Use realistic cruise industry pricing patterns.

Reservations to check:
${resList}

Rules:
- Base estimates on realistic current cruise market pricing
- Interior cabins on NCL typically range $600-$1,400 for 7-night sailings
- Solo studios on NCL typically range $900-$1,800
- Price drops of 5-20% are common as sail date approaches
- Sometimes prices rise as sailings fill up
- Return ONLY a valid JSON array, no markdown, no explanation

Format:
[{"id":"the_exact_id","currentPrice":1150},{"id":"another_id","currentPrice":820}]`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content.map(c => ('text' in c ? c.text : '')).join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const results = JSON.parse(clean)

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Price check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
