import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  if (!user || !pass) {
    console.warn('[Email] SMTP credentials not configured, skipping email')
    return false
  }

  // Skip in mock mode
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    console.log('[Email] Mock mode, skipping email to:', options.to)
    return true
  }

  const transporter = getTransporter()
  const fromName = process.env.SMTP_FROM_NAME || 'WorkFlow Task Management'
  const fromEmail = process.env.SMTP_FROM_EMAIL || user

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      })
      console.log(`[Email] Sent to ${options.to}: ${options.subject}`)
      return true
    } catch (error) {
      console.error(`[Email] Attempt ${attempt}/${MAX_RETRIES} failed:`, error)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt))
      }
    }
  }
  return false
}
