import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType, isImage } = await req.json()

    const prompt = `You are a cruise reservation invoice parser. Extract the following fields and respond ONLY with a valid JSON object:
{"client":"name","line":"cruise line","ship":"ship name","sailDate":"YYYY-MM-DD","cabin":"cabin type","conf":"conf number","pricePaid":1000,"obc":0,"balance":0,"autoCharge":""}
Replace numbers with actual values. Return ONLY the JSON.`

    const imageContent = isImage
      ? { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }

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
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }]
      })
    })

    const data = await resp.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.content?.map((c: any) => c.text || '').join('') || ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
