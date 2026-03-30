import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Fetch all active tasks with assignee and client info
    const now = new Date().toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tasks, error } = await (supabase as any)
      .from('tasks')
      .select(`
        id, title, confirmed_deadline, desired_deadline, status, client_id,
        assigned_user:users!tasks_assigned_to_fkey(id, name, email, manager_id),
        client:clients!client_id(name)
      `)
      .in('status', ['todo', 'in_progress', 'waiting'])
      .not('assigned_to', 'is', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter overdue tasks (deadline < today)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdueTasks = (tasks ?? []).filter((t: any) => {
      const deadline = t.confirmed_deadline ?? t.desired_deadline
      if (!deadline) return false
      return deadline < now
    })

    if (overdueTasks.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No overdue tasks' })
    }

    // Group tasks by assignee
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byAssignee = new Map<string, { user: any; tasks: any[] }>()
    for (const task of overdueTasks) {
      const user = task.assigned_user
      if (!user?.email) continue
      if (!byAssignee.has(user.id)) {
        byAssignee.set(user.id, { user, tasks: [] })
      }
      byAssignee.get(user.id)!.tasks.push(task)
    }

    // Send notification emails using the existing sendEmail helper
    const { sendEmail } = await import('@/lib/email/send-email')
    const { escapeHtml } = await import('@/lib/email/utils')

    const appUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'https://task-management-nine-iota.vercel.app'

    let sentCount = 0

    for (const [, { user, tasks: userTasks }] of byAssignee) {
      // Build HTML task table rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskRows = userTasks.map((t: any) => {
        const deadline = t.confirmed_deadline ?? t.desired_deadline
        const clientName = t.client?.name ?? ''
        return `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b;">${escapeHtml(t.title)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b;">${escapeHtml(clientName)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #dc2626; font-weight: 600;">${escapeHtml(deadline)}</td>
        </tr>`
      }).join('')

      const subject = `【WorkFlow】${userTasks.length}件の期限超過タスクがあります`
      const html = buildOverdueEmailHtml({
        recipientName: user.name,
        taskRows,
        taskCount: userTasks.length,
        tasksUrl: `${appUrl}/tasks`,
      })

      const sent = await sendEmail({ to: user.email, subject, html })
      if (sent) sentCount++

      // Also notify manager if exists
      if (user.manager_id) {
        const { data: manager } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user.manager_id)
          .single()

        if (manager?.email) {
          const managerSubject = `【WorkFlow】${user.name}さんに${userTasks.length}件の期限超過タスクがあります`
          const managerHtml = buildOverdueEmailHtml({
            recipientName: manager.name,
            taskRows,
            taskCount: userTasks.length,
            tasksUrl: `${appUrl}/tasks`,
            ownerName: user.name,
          })

          const managerSent = await sendEmail({ to: manager.email, subject: managerSubject, html: managerHtml })
          if (managerSent) sentCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      overdueTasks: overdueTasks.length,
      assignees: byAssignee.size,
      emailsSent: sentCount,
    })
  } catch (error) {
    console.error('[daily-overdue] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function buildOverdueEmailHtml(params: {
  recipientName: string
  taskRows: string
  taskCount: number
  tasksUrl: string
  ownerName?: string
}): string {
  const { recipientName, taskRows, taskCount, tasksUrl, ownerName } = params

  const greeting = ownerName
    ? `${recipientName}さん、${ownerName}さんの${taskCount}件のタスクが期限を超過しています`
    : `${recipientName}さん、${taskCount}件のタスクが期限を超過しています`

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WorkFlow - 期限超過タスク通知</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #dc2626; padding: 24px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">
                WorkFlow - 期限超過タスク通知
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <p style="margin: 0; font-size: 16px; color: #18181b; line-height: 1.6;">
                ${greeting}
              </p>
            </td>
          </tr>

          <!-- Task Table -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden;">
                <tr>
                  <th style="padding: 10px 12px; background-color: #fef2f2; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #71717a; font-weight: 600; text-align: left;">タスク名</th>
                  <th style="padding: 10px 12px; background-color: #fef2f2; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #71717a; font-weight: 600; text-align: left;">クライアント</th>
                  <th style="padding: 10px 12px; background-color: #fef2f2; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #71717a; font-weight: 600; text-align: left;">期限</th>
                </tr>
                ${taskRows}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 24px 32px;" align="center">
              <a href="${tasksUrl}" target="_blank" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                タスクを確認する
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center; line-height: 1.5;">
                このメールはWorkFlowシステムから自動送信されています。返信はできません。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
