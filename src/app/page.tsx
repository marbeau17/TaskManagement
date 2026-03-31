import { redirect } from 'next/navigation'
import { APP_CONFIG } from '@/lib/config'

export default function Home() {
  redirect(APP_CONFIG.branding.landingPage)
}
