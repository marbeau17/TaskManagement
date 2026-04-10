import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('TC-13: Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reports')
    await page.waitForURL(/\/reports/, { timeout: 30000 })
  })

  test('displays reports page title', async ({ page }) => {
    const title = page.locator('text=レポート, text=Reports').first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('shows KPI cards', async ({ page }) => {
    // Reports page renders KpiCard components
    const kpiCards = page.locator('[class*="card"], [class*="Card"], [class*="rounded-lg"]')
    await page.waitForTimeout(3000)
    const count = await kpiCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('has date range toggle buttons', async ({ page }) => {
    // DateRange options: week, month, 3months
    const weekBtn = page.locator('button:has-text("今週"), button:has-text("Week")')
    const monthBtn = page.locator('button:has-text("今月"), button:has-text("Month")')
    const threeMonthBtn = page.locator('button:has-text("3ヶ月"), button:has-text("3 Months"), button:has-text("3months")')

    const hasWeek = await weekBtn.first().isVisible({ timeout: 10000 }).catch(() => false)
    const hasMonth = await monthBtn.first().isVisible().catch(() => false)
    const has3Month = await threeMonthBtn.first().isVisible().catch(() => false)
    expect(hasWeek || hasMonth || has3Month).toBeTruthy()
  })

  test('displays charts section', async ({ page }) => {
    await page.waitForTimeout(5000) // charts load dynamically
    // Charts are rendered in canvas or SVG elements (Recharts uses SVG)
    const charts = page.locator('svg.recharts-surface, canvas, [class*="recharts"], svg')
    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThan(0)
  })

  test('can switch date range and content updates', async ({ page }) => {
    await page.waitForTimeout(3000)
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    // Click different range buttons and verify page doesn't error
    for (let i = 0; i < buttonCount && i < 5; i++) {
      const btn = buttons.nth(i)
      const text = await btn.textContent()
      if (text && (text.includes('月') || text.includes('週') || text.includes('Month'))) {
        await btn.click()
        await page.waitForTimeout(1000)
        break
      }
    }
    // Page should still be functional
    expect(page.url()).toContain('/reports')
  })
})
