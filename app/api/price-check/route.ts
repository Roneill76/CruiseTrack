import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { reservations } = await req.json()
    const resList = reservations.map((r: any) =>
      `ID: ${r.id} | Client: ${r.client} | Line: ${r.line} | Ship: ${r.ship} | Sail: ${r.sail_date} | Cabin: ${r.cabin} | Paid: $${r.price_paid}`
    ).join('\n')

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: `For each reservation estimate the current market price. Return ONLY a JSON array: [{"id":"exact_id","currentPrice":1150}]\n\n${resList}` }]
      })
    })

    const data = await resp.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.content?.map((c: any) => c.text || '').join('') || ''
    const results = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
