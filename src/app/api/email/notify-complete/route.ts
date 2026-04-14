import { NextRequest, NextResponse } from 'next/server'
import { sendTaskCompletionEmail } from '@/lib/email/task-completion'

export async function POST(request: NextRequest) {
  try {
    const params = await request.json()
    await sendTaskCompletionEmail(params)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notify-complete] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
