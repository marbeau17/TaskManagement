import { forceChangePassword } from '@/lib/data/members'

export async function POST(request: Request) {
  const { userId, newPassword } = await request.json()

  if (!userId || !newPassword) {
    return Response.json(
      { success: false, error: 'Missing fields' },
      { status: 400 }
    )
  }

  if (newPassword.length < 8) {
    return Response.json(
      { success: false, error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const result = await forceChangePassword(userId, newPassword)
  return Response.json(result)
}
