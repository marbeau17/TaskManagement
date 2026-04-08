import { Page } from '@playwright/test'

export async function login(page: Page, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto('/login')
      await page.waitForSelector('input[name="email"]', { timeout: 10000 })
      await page.fill('input[name="email"]', 'o.yasuda@meetsc.co.jp')
      await page.fill('input[name="password"]', 'workflow2026')
      await page.click('button[type="submit"]')

      // Wait for loading state to clear
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]')
          return !btn || !btn.textContent?.includes('ログイン中')
        },
        { timeout: 15000 }
      ).catch(() => {})

      // Wait for navigation to dashboard, mypage, or change-password page
      await page.waitForURL(/\/(dashboard|mypage|change-password)/, { timeout: 30000 })
      return // success
    } catch (error) {
      if (attempt < retries) {
        // Wait before retrying to avoid rate limiting
        await page.waitForTimeout(2000)
      } else {
        throw error
      }
    }
  }
}
