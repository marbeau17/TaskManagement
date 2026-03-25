import { NextResponse } from 'next/server'
import type { TaskWithRelations } from '@/types/database'
import { STATUS_LABELS } from '@/lib/constants'
import { useMock } from '@/lib/utils'

function escapeCsvValue(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(date: string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

function buildCsv(tasks: TaskWithRelations[]): string {
  const headers = [
    'ID',
    'クライアント',
    'タイトル',
    'ステータス',
    '進捗(%)',
    '依頼者',
    '担当者',
    'ディレクター',
    '希望納期',
    '確定納期',
    '見積工数',
    '実績工数',
    '作成日',
  ]

  const header = headers.map(escapeCsvValue).join(',')

  const rows = tasks.map((t) =>
    [
      t.id,
      t.client?.name ?? '',
      t.title,
      STATUS_LABELS[t.status] ?? t.status,
      String(t.progress ?? 0),
      t.requester?.name ?? '',
      t.assigned_user?.name ?? '',
      t.director?.name ?? '',
      t.desired_deadline ? formatDate(t.desired_deadline) : '',
      t.confirmed_deadline ? formatDate(t.confirmed_deadline) : '',
      t.estimated_hours != null ? `${t.estimated_hours.toFixed(1)}h` : '',
      `${(t.actual_hours ?? 0).toFixed(1)}h`,
      formatDate(t.created_at),
    ]
      .map(escapeCsvValue)
      .join(',')
  )

  return [header, ...rows].join('\r\n')
}

export async function GET() {
  try {
    let tasks: TaskWithRelations[]

    if (useMock()) {
      const { getMockTasks } = await import('@/lib/mock/handlers')
      tasks = getMockTasks()
    } else {
      const { createServerSupabaseClient } = await import(
        '@/lib/supabase/server'
      )
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('tasks')
        .select(
          '*, client:clients(*), assigned_user:users!assigned_to(*), requester:users!requested_by(*), director:users!director_id(*)'
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      tasks = (data ?? []) as TaskWithRelations[]
    }

    const csv = buildCsv(tasks)
    const BOM = '\uFEFF'
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[-:T]/g, '')

    return new NextResponse(BOM + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tasks_${timestamp}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export tasks', detail: String(error) },
      { status: 500 }
    )
  }
}
