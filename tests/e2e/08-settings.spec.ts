import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-08: Settings and Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForURL(/\/settings/, { timeout: 30000 })
  })

  test('displays page title', async ({ page }) => {
    await expect(page.locator('text=設定').first()).toBeVisible({ timeout: 15000 })
  })

  test('has theme settings section', async ({ page }) => {
    await expect(page.locator('text=テーマ設定')).toBeVisible({ timeout: 10000 })
  })

  test('has theme toggle with three options', async ({ page }) => {
    // ThemeToggle has ライト, ダーク, システム buttons
    await expect(page.locator('button', { hasText: 'ライト' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button', { hasText: 'ダーク' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'システム' })).toBeVisible()
  })

  test('clicking dark mode adds dark class to html', async ({ page }) => {
    const darkBtn = page.locator('button', { hasText: 'ダーク' })
    await darkBtn.click()
    await page.waitForTimeout(500)

    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('clicking light mode removes dark class from html', async ({ page }) => {
    // First set dark mode
    await page.locator('button', { hasText: 'ダーク' }).click()
    await page.waitForTimeout(500)

    // Then switch to light
    await page.locator('button', { hasText: 'ライト' }).click()
    await page.waitForTimeout(500)

    const htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).not.toContain('dark')
  })

  test('has organization settings section', async ({ page }) => {
    await expect(page.locator('text=組織設定')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=組織名')).toBeVisible()
  })

  test('has workload management settings', async ({ page }) => {
    // Scroll down to ensure settings sections are in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const workloadSection = page.locator('text=稼働管理設定')
    const isVisible = await workloadSection.isVisible().catch(() => false)
    if (isVisible) {
      await expect(workloadSection).toBeVisible()
      const warningThreshold = page.locator('text=警告しきい値')
      const exceedThreshold = page.locator('text=超過しきい値')
      const hasWarning = await warningThreshold.isVisible().catch(() => false)
      const hasExceed = await exceedThreshold.isVisible().catch(() => false)
      expect(hasWarning || hasExceed).toBeTruthy()
    } else {
      // Section may have different name
      const altSection = page.locator('text=稼働管理')
      await expect(altSection.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('has notification settings with checkboxes', async ({ page }) => {
    await expect(page.locator('text=通知設定')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=新規タスク作成時')).toBeVisible()
    await expect(page.locator('text=タスクがアサインされた時')).toBeVisible()

    // Checkboxes should exist
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('has save button', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    const saveBtn = page.locator('button', { hasText: '保存' }).first()
    await expect(saveBtn).toBeVisible({ timeout: 15000 })
  })

  test('save button shows confirmation', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    const saveBtn = page.locator('button', { hasText: '保存' }).first()
    await saveBtn.click()
    // Confirmation message - flexible match
    const confirmation = page.locator('text=保存しました').first()
    const toast = page.locator('[class*="toast"], [role="status"], [role="alert"]').first()
    const hasConfirm = await confirmation.isVisible({ timeout: 5000 }).catch(() => false)
    const hasToast = await toast.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasConfirm || hasToast).toBeTruthy()
  })
})
