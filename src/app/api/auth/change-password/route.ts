import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { changePassword } from '@/lib/data/members'

export async function POST(request: NextRequest) {
  try {
    const { userId, oldPassword, newPassword } = await request.json()

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'userId, oldPassword, and newPassword are required' },
        { status: 400 }
      )
    }

    const result = await changePassword(userId, oldPassword, newPassword)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to change password', detail: String(error) },
      { status: 500 }
    )
  }
}
