import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as {
      id?: string
      name?: string
      value?: number
      rating?: string
      path?: string
    }
    if (!payload?.name || typeof payload.value !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.info('[web-vitals]', {
      id: payload.id,
      name: payload.name,
      value: payload.value,
      rating: payload.rating,
      path: payload.path,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
}
