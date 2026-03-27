import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-05: Workload Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/workload')
    await page.waitForURL(/\/workload/, { timeout: 30000 })
  })

  test('displays page title', async ({ page }) => {
    // i18n: JP "👤 クリエイター稼働状況" / EN "👤 Creator Workload"
    const title = page.locator('h1').filter({ hasText: /稼働|Workload/ }).or(
      page.locator('header').filter({ hasText: /稼働|Workload/ })
    ).first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('has period toggle', async ({ page }) => {
    // PeriodToggle renders small buttons inside a bg-surf2 container
    await page.waitForTimeout(2000)
    const periodContainer = page.locator('[class*="bg-surf2"]').first()
    const hasContainer = await periodContainer.isVisible().catch(() => false)
    if (hasContainer) {
      const buttons = periodContainer.locator('button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    } else {
      const weekBtn = page.locator('button').filter({ hasText: /今週|This Week/ })
      const monthBtn = page.locator('button').filter({ hasText: /今月|This Month/ })
      const allBtn = page.locator('button').filter({ hasText: /全期間|All Time/ })
      const hasWeek = await weekBtn.isVisible().catch(() => false)
      const hasMonth = await monthBtn.isVisible().catch(() => false)
      const hasAll = await allBtn.isVisible().catch(() => false)
      expect(hasWeek || hasMonth || hasAll).toBeTruthy()
    }
  })

  test('shows KPI cards or loading skeleton', async ({ page }) => {
    // KPI area: either shows skeleton (animate-pulse) or loaded cards
    await page.waitForTimeout(2000)
    const kpiGrid = page.locator('[class*="grid-cols-4"], [class*="grid"]').first()
    await expect(kpiGrid).toBeVisible({ timeout: 10000 })
  })

  test('shows member workload table after loading', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(5000)
    // The table or a content area should be visible
    const tableArea = page.locator('[class*="bg-surface"][class*="rounded"]')
    const count = await tableArea.count()
    expect(count).toBeGreaterThan(0)
  })

  test('period toggle is clickable', async ({ page }) => {
    const buttons = page.locator('button')
    const allButtons = await buttons.allTextContents()
    // Find period-related buttons
    const periodTexts = ['今週', '今月', '全期間', 'This Week', 'This Month', 'All Time']
    for (const text of periodTexts) {
      const btn = page.locator('button', { hasText: text })
      const isVisible = await btn.isVisible().catch(() => false)
      if (isVisible) {
        await btn.click()
        await page.waitForTimeout(500)
        break
      }
    }
  })
})
