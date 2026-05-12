import { sendEmail } from './send-email'
import { getAssignmentEmailHtml } from './templates'

interface TaskAssignmentNotification {
  taskId: string
  taskTitle: string
  clientName: string
  confirmedDeadline: string | null
  estimatedHours: number | null
  directorName: string
  description: string | null
  assigneeEmail: string
  assigneeName: string
  assignerId: string  // to check self-assign
  assigneeId: string
}

export async function sendTaskAssignmentEmail(params: TaskAssignmentNotification): Promise<void> {
  // Don't send if self-assigning
  if (params.assignerId === params.assigneeId) return

  // Don't send if no email
  if (!params.assigneeEmail) return

  const appUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const taskUrl = `${appUrl}/tasks/${params.taskId}`

  // Default to Japanese
  const locale = 'ja' as const

  const subject = locale === 'ja'
    ? `[WorkFlow] タスクがアサインされました: ${params.taskTitle}`
    : `[WorkFlow] Task assigned to you: ${params.taskTitle}`

  const html = getAssignmentEmailHtml({
    recipientName: params.assigneeName,
    taskTitle: params.taskTitle,
    clientName: params.clientName,
    confirmedDeadline: params.confirmedDeadline,
    estimatedHours: params.estimatedHours,
    directorName: params.directorName,
    description: params.description,
    taskUrl,
    locale,
  })

  // WEB-46: must await — Vercel serverless freezes the function as soon as
  // the API response is returned, so fire-and-forget kills the SMTP send
  // before delivery. Caller-side fetch is already fire-and-forget, so awaiting
  // here doesn't block the UI.
  try {
    await sendEmail({
      to: params.assigneeEmail,
      subject,
      html,
    })
  } catch (err) {
    console.error('[TaskAssignment] Email failed:', err)
  }
}
