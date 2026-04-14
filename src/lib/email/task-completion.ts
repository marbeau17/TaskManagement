import { sendEmail } from './send-email'
import { getCompletionEmailHtml } from './templates'

interface TaskCompletionNotification {
  taskId: string
  taskTitle: string
  clientName: string
  completedByName: string
  estimatedHours: number | null
  actualHours: number | null
  requesterEmail: string
  requesterName: string
  completerId: string
  requesterId: string
}

export async function sendTaskCompletionEmail(params: TaskCompletionNotification): Promise<void> {
  // Don't send if self-completion
  if (params.completerId === params.requesterId) return

  // Don't send if no email
  if (!params.requesterEmail) return

  const appUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const taskUrl = `${appUrl}/tasks/${params.taskId}`

  // Default to Japanese
  const locale = 'ja' as const

  const subject = locale === 'ja'
    ? `[WorkFlow] タスクが完了しました: ${params.taskTitle}`
    : `[WorkFlow] Task completed: ${params.taskTitle}`

  const html = getCompletionEmailHtml({
    recipientName: params.requesterName,
    taskTitle: params.taskTitle,
    clientName: params.clientName,
    completedByName: params.completedByName,
    estimatedHours: params.estimatedHours,
    actualHours: params.actualHours,
    taskUrl,
    locale,
  })

  // Fire and forget - don't block the completion
  sendEmail({
    to: params.requesterEmail,
    subject,
    html,
  }).catch(err => {
    console.error('[TaskCompletion] Email failed:', err)
  })
}
