import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S07: Theme Switching and Persistence', () => {
  test('dark mode persists across page navigations', async ({ page }) => {
    // Step 1: Login
    await login(page)

    // Step 2: Go to /settings
    await page.goto('/settings')
    await page.waitForURL(/\/settings/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // Step 3: Find theme toggle section — settings now uses tabs, and i18n may show English or Japanese
    // Click the theme tab first (may say "テーマ設定" or "Theme")
    const themeTab = page.locator('button', { hasText: /テーマ設定|Theme/ })
    await expect(themeTab).toBeVisible({ timeout: 10000 })
    await themeTab.click()
    await page.waitForTimeout(500)

    // Step 4: Click "ダーク" → verify html has dark class
    const darkBtn = page.locator('button', { hasText: /ダーク|Dark/ })
    await expect(darkBtn).toBeVisible({ timeout: 10000 })
    await darkBtn.click()
    await page.waitForTimeout(1000)

    let htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).toContain('dark')

    // Step 5: Navigate to /dashboard → verify dark class persists
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(1000)

    htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).toContain('dark')

    // Step 6: Navigate to /tasks → verify dark class persists
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })
    await page.waitForTimeout(1000)

    htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).toContain('dark')

    // Step 7: Go back to settings and switch to light mode
    await page.goto('/settings')
    await page.waitForURL(/\/settings/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // Click theme tab again
    const themeTab2 = page.locator('button', { hasText: /テーマ設定|Theme/ })
    await themeTab2.click()
    await page.waitForTimeout(500)

    const lightBtn = page.locator('button', { hasText: /ライト|Light/ })
    await expect(lightBtn).toBeVisible({ timeout: 10000 })
    await lightBtn.click()
    await page.waitForTimeout(1000)

    htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).not.toContain('dark')

    // Step 8: Navigate away and back → verify light mode persists
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(1000)

    htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).not.toContain('dark')

    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })
    await page.waitForTimeout(1000)

    htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).not.toContain('dark')
  })
})
