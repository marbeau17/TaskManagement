// nodemailer is imported dynamically to avoid bundling in client components
interface EmailOptions {
  to: string
  subject: string
  html: string
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

async function getSmtpConfig() {
  // First check environment variables
  let host = process.env.SMTP_HOST
  let port = process.env.SMTP_PORT
  let user = process.env.SMTP_USER
  let pass = process.env.SMTP_PASSWORD
  let fromName = process.env.SMTP_FROM_NAME
  let fromEmail = process.env.SMTP_FROM_EMAIL

  // Fallback: check DB settings (for settings configured via UI)
  if (!user || !pass) {
    try {
      const { getSetting } = await import('@/lib/data/settings')
      const [dbHost, dbPort, dbUser, dbPass, dbFromName, dbFromEmail] = await Promise.all([
        getSetting('smtp_host'),
        getSetting('smtp_port'),
        getSetting('smtp_user'),
        getSetting('smtp_password'),
        getSetting('smtp_from_name'),
        getSetting('smtp_from_email'),
      ])
      host = host || dbHost || 'smtp.gmail.com'
      port = port || dbPort || '587'
      user = user || dbUser || ''
      pass = pass || dbPass || ''
      fromName = fromName || dbFromName || 'WorkFlow Task Management'
      fromEmail = fromEmail || dbFromEmail || user
    } catch {
      // Settings module not available, use env only
    }
  }

  return { host: host || 'smtp.gmail.com', port: Number(port) || 587, user, pass, fromName: fromName || 'WorkFlow Task Management', fromEmail: fromEmail || user || '' }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = await getSmtpConfig()

  if (!config.user || !config.pass) {
    console.warn('[Email] SMTP credentials not configured, skipping email')
    return false
  }

  // Skip in mock mode
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    console.log('[Email] Mock mode, skipping email to:', options.to)
    return true
  }

  const nodemailer = (await import('nodemailer')).default
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false,
    auth: { user: config.user, pass: config.pass },
  })

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
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
