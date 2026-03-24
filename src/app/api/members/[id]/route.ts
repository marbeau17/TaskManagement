import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteMember } from '@/lib/data/members'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = await deleteMember(id)
    return NextResponse.json({ success })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete member', detail: String(error) },
      { status: 500 }
    )
  }
}
