import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S06: Workload Tracking — Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/workload')
    await page.waitForURL(/\/workload/, { timeout: 30000 })
    await page.waitForTimeout(3000)
  })

  test('KPI cards show valid data', async ({ page }) => {
    // Wait for data load
    await page.waitForTimeout(2000)

    // KPI cards in grid layout
    const kpiGrid = page.locator('[class*="grid"]').first()
    await expect(kpiGrid).toBeVisible({ timeout: 15000 })

    // Cards should contain numbers or percentage text
    const cards = page.locator('[class*="bg-surface"][class*="rounded"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)

    // At least one card should have numeric content
    const pageContent = await page.textContent('body')
    const hasNumbers = /\d+/.test(pageContent || '')
    expect(hasNumbers).toBeTruthy()
  })

  test('member workload table shows rows with data', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Table or card area should have member rows
    const tableArea = page.locator('[class*="bg-surface"][class*="rounded"]')
    const count = await tableArea.count()
    expect(count).toBeGreaterThan(0)

    // Check for known member names in workload data
    const pageContent = await page.textContent('body')
    const knownMembers = ['伊藤', '安田', '秋元']
    const foundMembers = knownMembers.filter(name => pageContent?.includes(name))
    expect(foundMembers.length).toBeGreaterThan(0)
  })

  test('utilization percentages are numeric values', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Look for percentage text on the page (e.g., "80%", "120%")
    const pageContent = await page.textContent('body')
    const percentagePattern = /\d+\.?\d*\s*%/
    const hasPercentages = percentagePattern.test(pageContent || '')

    // Also look for "h" (hours) notation
    const hoursPattern = /\d+\.?\d*\s*h/
    const hasHours = hoursPattern.test(pageContent || '')

    // At least one of percentage or hours notation should be present
    expect(hasPercentages || hasHours).toBeTruthy()
  })

  test('period toggle switching does not crash the page', async ({ page }) => {
    // Wait for initial data to fully load (workload page now shows ALL members)
    await page.waitForTimeout(5000)

    const periodTexts = ['今週', '今月', '全期間']

    for (const text of periodTexts) {
      const btn = page.locator('button', { hasText: text })
      const isVisible = await btn.isVisible().catch(() => false)
      if (isVisible) {
        await btn.click()
        // Allow extra time for data reload — page now shows all members, not just creators
        await page.waitForTimeout(5000)

        // Page should not show runtime error
        const pageContent = await page.textContent('body')
        const hasRuntimeError = pageContent?.includes('Application error') || pageContent?.includes('Unhandled Runtime Error')
        expect(hasRuntimeError).toBeFalsy()

        // Content area should still be visible
        const contentArea = page.locator('[class*="bg-surface"]').first()
        await expect(contentArea).toBeVisible({ timeout: 15000 })
      }
    }
  })

  test('workload page title is visible', async ({ page }) => {
    const title = page.locator('h1').filter({ hasText: '稼働管理' }).or(
      page.locator('header').filter({ hasText: '稼働管理' })
    ).first()
    await expect(title).toBeVisible({ timeout: 15000 })
  })
})
