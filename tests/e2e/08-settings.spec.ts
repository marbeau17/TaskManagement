import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-08: Settings and Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForURL(/\/settings/, { timeout: 30000 })
    await page.waitForTimeout(2000)
  })

  test('displays page title', async ({ page }) => {
    // Title may be Japanese (設定) or English (Settings) depending on i18n locale
    const title = page.locator('h1').filter({ hasText: /設定|Settings/ }).first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('has theme settings section', async ({ page }) => {
    // Settings now uses tabs — click the theme tab (テーマ設定 or Theme)
    const themeTab = page.locator('button', { hasText: /テーマ設定|Theme/ })
    await expect(themeTab).toBeVisible({ timeout: 10000 })
  })

  test('has theme toggle with three options', async ({ page }) => {
    // Click the theme tab first
    const themeTab = page.locator('button', { hasText: /テーマ設定|Theme/ })
    await themeTab.click()
    await page.waitForTimeout(500)

    // ThemeToggle has ライト/Light, ダーク/Dark, システム/System buttons
    await expect(page.locator('button', { hasText: /ライト|Light/ })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button', { hasText: /ダーク|Dark/ })).toBeVisible()
    await expect(page.locator('button', { hasText: /システム|System/ })).toBeVisible()
  })

  test('clicking dark mode adds dark class to html', async ({ page }) => {
    // Click the theme tab first
    const themeTab = page.locator('button', { hasText: /テーマ設定|Theme/ })
    await themeTab.click()
    await page.waitForTimeout(500)

    const darkBtn = page.locator('button', { hasText: /ダーク|Dark/ })
    await darkBtn.click()
    await page.waitForTimeout(500)

    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('clicking light mode removes dark class from html', async ({ page }) => {
    // Click the theme tab first
    const themeTab = page.locator('button', { hasText: /テーマ設定|Theme/ })
    await themeTab.click()
    await page.waitForTimeout(500)

    // First set dark mode
    await page.locator('button', { hasText: /ダーク|Dark/ }).click()
    await page.waitForTimeout(500)

    // Then switch to light
    await page.locator('button', { hasText: /ライト|Light/ }).click()
    await page.waitForTimeout(500)

    const htmlClass = await page.locator('html').getAttribute('class') ?? ''
    expect(htmlClass).not.toContain('dark')
  })

  test('has organization settings section', async ({ page }) => {
    // The general tab is active by default, showing organization settings
    // Tab label: 一般設定 or General
    const generalTab = page.locator('button', { hasText: /一般設定|General/ })
    const generalVisible = await generalTab.isVisible().catch(() => false)
    if (generalVisible) {
      await generalTab.click()
      await page.waitForTimeout(500)
    }
    // Look for organization name field (組織名 or Organization Name)
    const orgLabel = page.locator('text=組織名').or(page.locator('text=Organization Name')).first()
    await expect(orgLabel).toBeVisible({ timeout: 10000 })
  })

  test('has workload management settings', async ({ page }) => {
    // Click the workload tab (稼働管理設定 or Workload)
    const workloadTab = page.locator('button', { hasText: /稼働管理|Workload/ })
    await expect(workloadTab).toBeVisible({ timeout: 10000 })
    await workloadTab.click()
    await page.waitForTimeout(500)

    // Look for threshold fields
    const warningThreshold = page.locator('text=警告しきい値').or(page.locator('text=Warning Threshold')).first()
    const exceedThreshold = page.locator('text=超過しきい値').or(page.locator('text=Danger Threshold')).first()
    const hasWarning = await warningThreshold.isVisible().catch(() => false)
    const hasExceed = await exceedThreshold.isVisible().catch(() => false)
    expect(hasWarning || hasExceed).toBeTruthy()
  })

  test('has notification settings with checkboxes', async ({ page }) => {
    // Click the notification tab (通知設定 or Notifications)
    const notifTab = page.locator('button', { hasText: /通知設定|Notification/ })
    await expect(notifTab).toBeVisible({ timeout: 10000 })
    await notifTab.click()
    await page.waitForTimeout(500)

    // Notification items may be in Japanese or English
    const newTaskLabel = page.locator('text=新規タスク作成時').or(page.locator('text=When a new task is created')).first()
    await expect(newTaskLabel).toBeVisible({ timeout: 10000 })

    const assignLabel = page.locator('text=タスクがアサインされた時').or(page.locator('text=When a task is assigned')).first()
    await expect(assignLabel).toBeVisible()

    // Checkboxes should exist
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('has save button', async ({ page }) => {
    // Save button (保存 or Save)
    const saveBtn = page.locator('button', { hasText: /保存|Save/ }).first()
    await expect(saveBtn).toBeVisible({ timeout: 15000 })
  })

  test('save button shows confirmation', async ({ page }) => {
    const saveBtn = page.locator('button', { hasText: /保存|Save/ }).first()
    await saveBtn.click()
    // Confirmation message - flexible match for both languages
    const confirmation = page.locator('text=保存しました').or(page.locator('text=Settings saved')).first()
    const toast = page.locator('[class*="toast"], [role="status"], [role="alert"]').first()
    const hasConfirm = await confirmation.isVisible({ timeout: 5000 }).catch(() => false)
    const hasToast = await toast.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasConfirm || hasToast).toBeTruthy()
  })
})
