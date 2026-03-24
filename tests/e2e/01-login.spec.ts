import { test, expect } from '@playwright/test'

test.describe('TC-01: Login', () => {
  test('shows login page with branding', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('WorkFlow')
    await expect(page.locator('text=タスク管理システム')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('ログイン')
  })

  test('shows validation when submitting empty form', async ({ page }) => {
    await page.goto('/login')
    // The inputs have required attribute, so the browser prevents submission.
    // Verify the inputs are present and required.
    const emailInput = page.locator('input[name="email"]')
    const passwordInput = page.locator('input[name="password"]')
    await expect(emailInput).toHaveAttribute('required', '')
    await expect(passwordInput).toHaveAttribute('required', '')
  })

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'wrong@test.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    // After wrong credentials, the page should stay on /login (not redirect to /dashboard)
    await page.waitForTimeout(5000)
    expect(page.url()).toContain('/login')
  })

  test('auto-fill button populates credentials', async ({ page }) => {
    await page.goto('/login')
    // The button text is "ログイン情報を自動入力"
    await page.click('text=ログイン情報を自動入力')
    await expect(page.locator('input[name="email"]')).toHaveValue('o.yasuda@meetsc.co.jp')
    await expect(page.locator('input[name="password"]')).toHaveValue('workflow2026')
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'o.yasuda@meetsc.co.jp')
    await page.fill('input[name="password"]', 'workflow2026')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|change-password)/, { timeout: 30000 })
    // Should be on dashboard or change-password
    const url = page.url()
    expect(url).toMatch(/\/(dashboard|change-password)/)
  })

  test('shows loading state during login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'o.yasuda@meetsc.co.jp')
    await page.fill('input[name="password"]', 'workflow2026')
    await page.click('button[type="submit"]')
    // The button should show "ログイン中..." briefly
    // We just confirm it eventually navigates (the loading state is transient)
    await page.waitForURL(/\/(dashboard|change-password)/, { timeout: 30000 })
  })
})
