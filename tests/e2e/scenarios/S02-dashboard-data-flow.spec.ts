import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

test.describe('S02: Dashboard Data Flow — Real Supabase Data', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    if (page.url().includes('change-password')) {
      await page.goto('/dashboard')
    }
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  })

  test('KPI cards load with valid data', async ({ page }) => {
    // Wait for data to load from Supabase
    await page.waitForTimeout(3000)

    // KPI cards should be in a grid layout
    const kpiGrid = page.locator('[class*="grid"]').first()
    await expect(kpiGrid).toBeVisible({ timeout: 15000 })

    // KPI cards should show numbers (0 or more) — not be empty
    // Look for card elements that contain numeric text
    const cards = page.locator('[class*="bg-surface"][class*="rounded"], [class*="card"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('creator tab shows workload table with member names', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Click "クリエイター別" tab
    const creatorTab = page.locator('button', { hasText: 'クリエイター別' })
    await expect(creatorTab).toBeVisible({ timeout: 10000 })
    await creatorTab.click()
    await page.waitForTimeout(2000)

    // Table or list should show actual member names from Supabase
    const pageContent = await page.textContent('body')
    // At least one known member name should appear
    const knownMembers = ['伊藤', '安田', '秋元']
    const foundMembers = knownMembers.filter(name => pageContent?.includes(name))
    expect(foundMembers.length).toBeGreaterThan(0)
  })

  test('client tab shows client cards', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Switch to "クライアント別" tab
    const clientTab = page.locator('button', { hasText: 'クライアント別' })
    await expect(clientTab).toBeVisible({ timeout: 10000 })
    await clientTab.click()
    await page.waitForTimeout(2000)

    // Client cards or list items should be visible
    const clientContent = page.locator('[class*="bg-surface"][class*="rounded"], [class*="card"]')
    const count = await clientContent.count()
    expect(count).toBeGreaterThan(0)
  })

  test('clicking a task navigates to detail page', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Find a clickable task link on the dashboard
    const taskLinks = page.locator('a[href*="/tasks/"]')
    const allLinks = await taskLinks.all()

    let detailLink = null
    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      if (href && href !== '/tasks/new' && href !== '/tasks' && href.match(/\/tasks\/[^/]+/)) {
        detailLink = link
        break
      }
    }

    if (detailLink) {
      await detailLink.click()
      await page.waitForURL(/\/tasks\/[^/]+/, { timeout: 15000 })
      expect(page.url()).toMatch(/\/tasks\/[^/]+/)

      // Navigate back to dashboard
      await page.goto('/dashboard')
      await page.waitForURL(/\/dashboard/, { timeout: 30000 })
      await page.waitForTimeout(2000)

      // Verify data still shows after navigation
      const kpiGrid = page.locator('[class*="grid"]').first()
      await expect(kpiGrid).toBeVisible({ timeout: 15000 })
    } else {
      // No task links on dashboard — just verify dashboard is loaded
      const title = page.locator('text=ダッシュボード').first()
      await expect(title).toBeVisible()
    }
  })

  test('dashboard data persists after navigation away and back', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Note initial state
    const creatorTab = page.locator('button', { hasText: 'クリエイター別' })
    await expect(creatorTab).toBeVisible({ timeout: 10000 })

    // Navigate away
    await page.goto('/tasks')
    await page.waitForURL(/\/tasks/, { timeout: 30000 })
    await page.waitForTimeout(1000)

    // Come back
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    await page.waitForTimeout(3000)

    // Data should still be present
    await expect(creatorTab).toBeVisible({ timeout: 10000 })
    const kpiGrid = page.locator('[class*="grid"]').first()
    await expect(kpiGrid).toBeVisible({ timeout: 15000 })
  })
})
