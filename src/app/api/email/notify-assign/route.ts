import { NextRequest, NextResponse } from 'next/server'
import { sendTaskAssignmentEmail } from '@/lib/email/task-assignment'

export async function POST(request: NextRequest) {
  try {
    const params = await request.json()
    await sendTaskAssignmentEmail(params)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notify-assign] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
