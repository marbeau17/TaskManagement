import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-02: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // If redirected to change-password, navigate to dashboard
    if (page.url().includes('change-password')) {
      await page.goto('/dashboard')
    }
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  })

  test('displays page title', async ({ page }) => {
    // Look for the dashboard title text in the page
    const title = page.locator('text=ダッシュボード').first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('displays KPI cards', async ({ page }) => {
    // KpiCards component renders multiple stat cards; wait for them to load
    const kpiSection = page.locator('[class*="grid"]').first()
    await expect(kpiSection).toBeVisible({ timeout: 10000 })
  })

  test('has creator and client tabs', async ({ page }) => {
    const creatorTab = page.locator('button', { hasText: 'クリエイター別' })
    const clientTab = page.locator('button', { hasText: 'クライアント別' })
    await expect(creatorTab).toBeVisible({ timeout: 10000 })
    await expect(clientTab).toBeVisible()
  })

  test('can switch between creator and client tabs', async ({ page }) => {
    const creatorTab = page.locator('button', { hasText: 'クリエイター別' })
    const clientTab = page.locator('button', { hasText: 'クライアント別' })

    // Click client tab
    await clientTab.click()
    // The client tab should now be active (has specific styling)
    await expect(clientTab).toBeVisible()

    // Click back to creator tab
    await creatorTab.click()
    await expect(creatorTab).toBeVisible()
  })

  test('has period toggle buttons', async ({ page }) => {
    // PeriodToggle renders small buttons (text-[11.5px]) for week/month/all inside Topbar header
    // The buttons are inside a flex container with bg-surf2
    await page.waitForTimeout(2000)
    const periodContainer = page.locator('[class*="bg-surf2"]').first()
    const hasContainer = await periodContainer.isVisible().catch(() => false)
    if (hasContainer) {
      // Check that the container has clickable buttons
      const buttons = periodContainer.locator('button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    } else {
      // Fallback: look for any button with period text
      const weekBtn = page.locator('button:has-text("今週")')
      const monthBtn = page.locator('button:has-text("今月")')
      const allBtn = page.locator('button:has-text("全期間")')
      const hasWeek = await weekBtn.isVisible().catch(() => false)
      const hasMonth = await monthBtn.isVisible().catch(() => false)
      const hasAll = await allBtn.isVisible().catch(() => false)
      expect(hasWeek || hasMonth || hasAll).toBeTruthy()
    }
  })

  test('sidebar navigation items exist', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible({ timeout: 10000 })

    // Check for known sidebar items — use flexible matching so adding new items doesn't break the test
    const expectedItems = ['ダッシュボード', 'タスク依頼', 'タスク一覧', 'クライアント', '稼働管理', 'メンバー', '設定', 'プロジェクト']
    let foundCount = 0
    for (const item of expectedItems) {
      const isVisible = await sidebar.locator(`text=${item}`).first().isVisible().catch(() => false)
      if (isVisible) foundCount++
    }
    // At least the core items should be present
    expect(foundCount).toBeGreaterThanOrEqual(6)
  })

  test('task request button links to /tasks/new', async ({ page }) => {
    // Could be a link or button in the sidebar or main content
    const newTaskLink = page.locator('a[href="/tasks/new"]').first()
    await expect(newTaskLink).toBeVisible({ timeout: 15000 })
    await newTaskLink.click()
    await page.waitForURL(/\/tasks\/new/, { timeout: 15000 })
    expect(page.url()).toContain('/tasks/new')
  })
})
